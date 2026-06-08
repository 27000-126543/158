import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import type { UserRole } from '@shared/types/index.js'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h'

export interface TokenPayload {
  id: string
  username: string
  role: UserRole
}

export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET as jwt.Secret, {
    expiresIn: JWT_EXPIRES_IN as string,
  })
}

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token已过期')
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('无效的Token')
    }
    throw new Error('Token验证失败')
  }
}

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload
  } catch (error) {
    return null
  }
}

export const getTokenExpiry = (token: string): number | null => {
  const decoded = decodeToken(token)
  if (!decoded) return null
  const payload = jwt.decode(token) as { exp?: number }
  return payload.exp || null
}

export const refreshToken = (oldToken: string): string => {
  const decoded = verifyToken(oldToken)
  return generateToken({
    id: decoded.id,
    username: decoded.username,
    role: decoded.role,
  })
}

export default {
  generateToken,
  verifyToken,
  decodeToken,
  getTokenExpiry,
  refreshToken,
}
