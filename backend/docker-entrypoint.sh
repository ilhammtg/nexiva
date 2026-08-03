#!/bin/sh
set -e

echo "🚀 Starting ISP Registration Service..."
echo "   ENV: ${APP_ENV}"
echo "   DB:  ${DB_HOST}:${DB_PORT}/${DB_NAME}"

# The Go binary itself handles DB connection retry on startup.
# This entrypoint just logs context then hands off.
exec "$@"
