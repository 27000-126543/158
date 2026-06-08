import { type Request, type Response, type NextFunction } from 'express'
import { redis } from '../utils/redis.js'
import { errorResponse } from '../utils/response.js'
import { logger } from '../utils/logger.js'

export interface RateLimitOptions {
  windowMs: number
  max: number
  keyPrefix?: string
  message?: string
}

const getClientKey = (req: Request, prefix: string): string => {
  const ip = req.headers['x-forwarded-for'] || req.ip || req.socket.remoteAddress || 'unknown'
  const clientId = Array.isArray(ip) ? ip[0] : ip
  return `${prefix}:${clientId}`
}

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, max, keyPrefix = 'rate_limit', message = '请求过于频繁，请稍后再试' } = options

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const key = getClientKey(req, keyPrefix)
      const current = await redis.incr(key)

      if (current === 1) {
        await redis.pexpire(key, windowMs)
      }

      const remaining = Math.max(0, max - current)
      const resetTime = await redis.pttl(key)

      res.setHeader('X-RateLimit-Limit', String(max))
      res.setHeader('X-RateLimit-Remaining', String(remaining))
      res.setHeader('X-RateLimit-Reset', String(Math.ceil(Date.now() + resetTime) / 1000))

      if (current > max) {
        res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)))
        res.status(429).json(errorResponse(message, 429))
        logger.warn(`限流触发: ${req.originalUrl} - ${key}`, { key, current, max })
        return
      }

      next()
    } catch (error) {
      logger.error('限流中间件错误', error)
      next()
    }
  }
}

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyPrefix: 'rate_limit:login',
  message: '登录尝试次数过多，请15分钟后再试',
})

export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  keyPrefix: 'rate_limit:api',
})

export const strictRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  keyPrefix: 'rate_limit:strict',
})
