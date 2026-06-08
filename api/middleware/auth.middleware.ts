import { type Request, type Response, type NextFunction } from 'express'
import { verifyToken } from '../utils/jwt.js'
import { successResponse, errorResponse } from '../utils/response.js'
import type { UserRole } from '@shared/types/index.js'

export interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    role: UserRole
  }
}

export const authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('未提供认证令牌', 401))
    return
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json(errorResponse('认证令牌无效或已过期', 401))
  }
}

export const requireRoles = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json(errorResponse('权限不足，无法访问该资源', 403))
      return
    }

    next()
  }
}

export const requireAdmin = requireRoles('admin')
export const requireFinance = requireRoles('finance', 'finance_director', 'admin')
export const requireFinanceDirector = requireRoles('finance_director', 'admin')
export const requireBusinessManager = requireRoles('business_manager', 'admin')
