package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"io"
	"strings"
)

// getAESKey derives a 32-byte key from the input key string.
// If the key is already 32 bytes, it is returned as is.
// Otherwise, it hashes the key using SHA-256 to guarantee a 32-byte key length.
func getAESKey(key string) []byte {
	keyBytes := []byte(key)
	if len(keyBytes) == 32 {
		return keyBytes
	}
	h := sha256.New()
	h.Write(keyBytes)
	return h.Sum(nil)
}

// Encrypt encrypts plaintext using AES-256-GCM.
// Returns a base64-encoded ciphertext.
func Encrypt(plaintext, key string) (string, error) {
	keyBytes := getAESKey(key)

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", fmt.Errorf("crypto.Encrypt: new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypto.Encrypt: new gcm: %w", err)
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("crypto.Encrypt: read nonce: %w", err)
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt decrypts a base64-encoded AES-256-GCM ciphertext.
func Decrypt(encoded, key string) (string, error) {
	ciphertext, err := base64.StdEncoding.DecodeString(encoded)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: base64 decode: %w", err)
	}

	// Plaintext fallback for mock/seeded entries
	if strings.HasPrefix(string(ciphertext), "plaintext:") {
		return strings.TrimPrefix(string(ciphertext), "plaintext:"), nil
	}

	keyBytes := getAESKey(key)

	block, err := aes.NewCipher(keyBytes)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: new cipher: %w", err)
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: new gcm: %w", err)
	}

	nonceSize := gcm.NonceSize()
	if len(ciphertext) < nonceSize {
		return "", fmt.Errorf("crypto.Decrypt: ciphertext too short")
	}

	nonce, ciphertext := ciphertext[:nonceSize], ciphertext[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("crypto.Decrypt: gcm open: %w", err)
	}

	return string(plaintext), nil
}

// GeneratePassword generates a cryptographically random alphanumeric password
// of the given length.
func GeneratePassword(length int) (string, error) {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	b := make([]byte, length)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("crypto.GeneratePassword: %w", err)
	}
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b), nil
}
