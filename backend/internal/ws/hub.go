package ws

import (
	"crypto/sha1"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net"
	"sync"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.uber.org/zap"
)

type Hub struct {
	mu        sync.RWMutex
	clients   map[net.Conn]bool
	logger    *zap.Logger
	jwtSecret string
}

func NewHub(jwtSecret string, logger *zap.Logger) *Hub {
	return &Hub{
		clients:   make(map[net.Conn]bool),
		logger:    logger,
		jwtSecret: jwtSecret,
	}
}

func (h *Hub) Upgrade(c *fiber.Ctx) error {
	tokenStr := c.Query("token")
	if tokenStr == "" {
		h.logger.Warn("ws upgrade rejected: missing token query param")
		return c.Status(401).SendString("Unauthorized")
	}

	// Validate JWT token
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return []byte(h.jwtSecret), nil
	})
	if err != nil || !token.Valid {
		h.logger.Warn("ws upgrade rejected: invalid token", zap.Error(err))
		return c.Status(401).SendString("Unauthorized")
	}

	key := c.Get("Sec-WebSocket-Key")
	if key == "" {
		return c.Status(400).SendString("Sec-WebSocket-Key missing")
	}

	// Handshake response calculation: Accept = base64(sha1(key + guid))
	guid := "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
	sha := sha1.New()
	sha.Write([]byte(key + guid))
	accept := base64.StdEncoding.EncodeToString(sha.Sum(nil))

	c.Set("Upgrade", "websocket")
	c.Set("Connection", "Upgrade")
	c.Set("Sec-WebSocket-Accept", accept)
	c.Status(101)

	// Hijack physical connection
	c.Context().Hijack(func(conn net.Conn) {
		h.mu.Lock()
		h.clients[conn] = true
		h.mu.Unlock()

		h.logger.Debug("ws client connected", zap.String("remote_addr", conn.RemoteAddr().String()))

		// Keep connection open and read (mandatory to detect client disconnection)
		buf := make([]byte, 1024)
		for {
			// Read from connection. This blocks until the client sends data or closes the connection.
			_, err := conn.Read(buf)
			if err != nil {
				// Client disconnected
				break
			}
		}

		h.mu.Lock()
		delete(h.clients, conn)
		h.mu.Unlock()
		conn.Close()
		h.logger.Debug("ws client disconnected", zap.String("remote_addr", conn.RemoteAddr().String()))
	})

	return nil
}

func (h *Hub) Broadcast(event string, data interface{}) {
	messageObj := map[string]interface{}{
		"event": event,
		"data":  data,
	}
	payload, err := json.Marshal(messageObj)
	if err != nil {
		h.logger.Error("failed to marshal ws broadcast payload", zap.Error(err))
		return
	}

	frame := makeTextFrame(payload)

	// Snapshot the client list under RLock so we don't hold a lock during I/O.
	h.mu.RLock()
	conns := make([]net.Conn, 0, len(h.clients))
	for conn := range h.clients {
		conns = append(conns, conn)
	}
	h.mu.RUnlock()

	for _, c := range conns {
		go func(conn net.Conn) {
			conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			if _, err := conn.Write(frame); err != nil {
				conn.Close()
				// Remove the stale client without holding a read lock
				h.mu.Lock()
				delete(h.clients, conn)
				h.mu.Unlock()
			}
		}(c)
	}
}

func makeTextFrame(payload []byte) []byte {
	var frame []byte
	frame = append(frame, 0x81) // FIN bit set, Opcode = 1 (Text Frame)
	length := len(payload)
	if length <= 125 {
		frame = append(frame, byte(length))
	} else if length <= 65535 {
		frame = append(frame, 126)
		frame = append(frame, byte(length>>8), byte(length))
	} else {
		frame = append(frame, 127)
		frame = append(frame,
			byte(length>>56), byte(length>>48), byte(length>>40), byte(length>>32),
			byte(length>>24), byte(length>>16), byte(length>>8), byte(length),
		)
	}
	frame = append(frame, payload...)
	return frame
}
