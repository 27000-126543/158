import { type Request, type Response, type NextFunction } from 'express'
import { logger } from '../utils/logger.js'
import type { AuthRequest } from './auth.middleware.js'

const getIpAddress = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }
  if (Array.isArray(forwarded)) {
    return forwarded[0]
  }
  return req.ip || req.socket.remoteAddress || 'unknown'
}

const getRequestBody = (req: Request): unknown => {
  if (req.method === 'GET') return null
  const body = { ...req.body }
  if (body.password) body.password = '***'
  if (body.newPassword) body.newPassword = '***'
  return body
}

export const requestLogger = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const startTime = Date.now()
  const ip = getIpAddress(req)
  const method = req.method
  const url = req.originalUrl
  const body = getRequestBody(req)

  logger.info(`[${method}] ${url} - IP: ${ip}`, {
    ip,
    method,
    url,
    userAgent: req.headers['user-agent'],
    body,
    userId: req.user?.id,
  })

  const originalSend = res.json.bind(res)
  res.json = ((data: unknown) => {
    const duration = Date.now() - startTime
    const statusCode = res.statusCode
    const level = statusCode >= 400 ? 'error' : 'info'

    logger[level](`[${method}] ${url} - ${statusCode} - ${duration}ms`, {
      ip,
      method,
      url,
      statusCode,
      duration,
      userId: req.user?.id,
      response: statusCode >= 400 ? data : undefined,
    })

    return originalSend(data)
  }) as typeof res.json

  next()
}

export const operationLogger = (module: string, action: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    res.on('finish', async () => {
      if (res.statusCode < 400 && req.user) {
        const ip = getIpAddress(req)
        const resourceId = req.params.id || req.body.id

        logger.info(`操作日志: ${module} - ${action}`, {
          module,
          action,
          userId: req.user.id,
          resourceId,
          ip,
          details: getRequestBody(req),
        })

        try {
          const { PrismaClient } = await import('@prisma/client')
          const prisma = new PrismaClient()
          await prisma.operationLog.create({
            data: {
              userId: req.user.id,
              action,
              module,
              resourceId,
              details: getRequestBody(req) as any,
              ipAddress: ip,
            },
          })
          await prisma.$disconnect()
        } catch (error) {
          logger.error('保存操作日志失败', error)
        }
      }
    })
    next()
  }
}
