package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"

	"isp-platform/registration/internal/response"
)

// RateLimit returns a Fiber middleware that enforces a rate limit per IP address
// using Redis as the backing store. It allows max `limit` requests per `window`.
func RateLimit(limit int, window time.Duration, rdb *redis.Client) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		key := fmt.Sprintf("ratelimit:%s:%s", c.Path(), ip)

		ctx := context.Background()
		count, err := rdb.Incr(ctx, key).Result()
		if err != nil {
			// If Redis is down, allow the request through (fail open)
			return c.Next()
		}

		// Set TTL only on the first request in this window
		if count == 1 {
			rdb.Expire(ctx, key, window) //nolint:errcheck
		}

		if int(count) > limit {
			return response.ErrorRaw(c, fiber.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED",
				fmt.Sprintf("Terlalu banyak permintaan. Coba lagi dalam %s.", window), nil)
		}

		return c.Next()
	}
}
