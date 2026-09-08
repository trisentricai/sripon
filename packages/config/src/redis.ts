import { Redis } from '@upstash/redis'

export function createRedis() {
  return new Redis({
    url: process.env.KV_REST_API_URL || process.env.REDIS_URL || '',
    token: process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN || '',
  })
}

export const redisClient = createRedis()
