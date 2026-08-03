package redis

import (
	"context"
	"fmt"

	"github.com/redis/go-redis/v9"

	"isp-platform/registration/internal/config"
)

// NewRedis initializes and validates a Redis client connection.
func NewRedis(cfg *config.Config) (*redis.Client, error) {
	rdb := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", cfg.RedisHost, cfg.RedisPort),
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("redis.NewRedis: ping: %w", err)
	}

	return rdb, nil
}
