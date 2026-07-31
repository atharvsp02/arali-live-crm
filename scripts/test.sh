#!/bin/sh

set -eu

docker compose up -d --wait postgres redis

postgres_endpoint=$(docker compose port postgres 5432)
postgres_port=${postgres_endpoint##*:}
redis_endpoint=$(docker compose port redis 6379)
redis_port=${redis_endpoint##*:}
test_database_url="postgresql://postgres:postgres@localhost:${postgres_port}/live_crm_test"
test_redis_url="redis://localhost:${redis_port}/15"

if [ "$(docker compose exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_database WHERE datname = 'live_crm_test'")" != "1" ]; then
  docker compose exec -T postgres createdb -U postgres live_crm_test
fi

DATABASE_URL="$test_database_url" pnpm --filter @live-crm/server db:migrate:deploy

if [ "${1:-}" = "--coverage" ]; then
  TEST_DATABASE_URL="$test_database_url" TEST_REDIS_URL="$test_redis_url" pnpm --filter @live-crm/server test:coverage
else
  TEST_DATABASE_URL="$test_database_url" TEST_REDIS_URL="$test_redis_url" pnpm --filter @live-crm/server test
fi
