import { Router, type Request, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, createdResponse } from '../utils/response.js'
import { generateToken, verifyToken } from '../utils/jwt.js'
import { comparePassword, hashPassword } from '../utils/password.js'
import { loginRateLimit } from '../middleware/rateLimit.middleware.js'
import { authenticate, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCache } from '../utils/redis.js'

const router = Router()
const prisma = new PrismaClient()

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, realName, role, email, phone } = req.body

    if (!username || !password || !realName || !role || !email || !phone) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const existingUser = await prisma.user.findUnique({ where: { username } })
    if (existingUser) {
      res.status(400).json(errorResponse('用户名已存在'))
      return
    }

    const hashedPassword = await hashPassword(password)

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        realName,
        role,
        email,
        phone,
      },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    res.status(201).json(createdResponse(user, '注册成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`注册失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/login', loginRateLimit, operationLogger('auth', 'login'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      res.status(400).json(errorResponse('用户名和密码不能为空'))
      return
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        email: true,
        phone: true,
        password: true,
      },
    })

    if (!user) {
      res.status(401).json(errorResponse('用户名或密码错误', 401))
      return
    }

    const isPasswordValid = await comparePassword(password, user.password)
    if (!isPasswordValid) {
      res.status(401).json(errorResponse('用户名或密码错误', 401))
      return
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      role: user.role,
    })

    await setCache(`token:${user.id}`, token, 24 * 60 * 60)

    const { password: _, ...userWithoutPassword } = user

    res.status(200).json(successResponse({
      user: userWithoutPassword,
      token,
      expiresIn: 24 * 60 * 60,
    }, '登录成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`登录失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/logout', authenticate, operationLogger('auth', 'logout'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.id) {
      await deleteCache(`token:${req.user.id}`)
    }
    res.status(200).json(successResponse(null, '登出成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`登出失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const cachedUser = await getCache(`user:${req.user.id}`)
    if (cachedUser) {
      res.status(200).json(successResponse(cachedUser, '获取用户信息成功'))
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        realName: true,
        role: true,
        email: true,
        phone: true,
        createdAt: true,
      },
    })

    if (!user) {
      res.status(404).json(errorResponse('用户不存在', 404))
      return
    }

    await setCache(`user:${user.id}`, user, 30 * 60)

    res.status(200).json(successResponse(user, '获取用户信息成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`获取用户信息失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/change-password', authenticate, operationLogger('auth', 'change_password'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { oldPassword, newPassword } = req.body

    if (!oldPassword || !newPassword) {
      res.status(400).json(errorResponse('旧密码和新密码不能为空'))
      return
    }

    if (!req.user?.id) {
      res.status(401).json(errorResponse('用户未认证', 401))
      return
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { password: true },
    })

    if (!user) {
      res.status(404).json(errorResponse('用户不存在', 404))
      return
    }

    const isPasswordValid = await comparePassword(oldPassword, user.password)
    if (!isPasswordValid) {
      res.status(400).json(errorResponse('旧密码错误'))
      return
    }

    const hashedPassword = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    })

    await deleteCache(`token:${req.user.id}`)

    res.status(200).json(successResponse(null, '密码修改成功，请重新登录'))
  } catch (error) {
    res.status(500).json(errorResponse(`修改密码失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
