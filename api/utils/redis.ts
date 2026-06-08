import Redis from 'ioredis'
import dotenv from 'dotenv'
import { logger } from './logger.js'

dotenv.config()

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  reconnectOnError: (err) => {
    const targetError = 'READONLY'
    if (err.message.includes(targetError)) {
      return true
    }
    return false
  },
})

redis.on('connect', () => {
  logger.info('Redis 连接成功')
})

redis.on('error', (err) => {
  logger.error('Redis 连接错误', err)
})

redis.on('close', () => {
  logger.warn('Redis 连接关闭')
})

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    logger.error(`获取缓存失败: ${key}`, error)
    return null
  }
}

export const setCache = async (key: string, value: unknown, ttlSeconds?: number): Promise<void> => {
  try {
    const data = JSON.stringify(value)
    if (ttlSeconds) {
      await redis.setex(key, ttlSeconds, data)
    } else {
      await redis.set(key, data)
    }
  } catch (error) {
    logger.error(`设置缓存失败: ${key}`, error)
  }
}

export const deleteCache = async (key: string): Promise<void> => {
  try {
    await redis.del(key)
  } catch (error) {
    logger.error(`删除缓存失败: ${key}`, error)
  }
}

export const deleteCacheByPattern = async (pattern: string): Promise<void> => {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    logger.error(`批量删除缓存失败: ${pattern}`, error)
  }
}

export default redis
