import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getTaskList, getTaskById, triggerTask, toggleTask } from '../scheduler.js'
import type { OperationLog, TaskInfo } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/logs', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const module = req.query.module as string
    const action = req.query.action as string
    const userId = req.query.userId as string
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string

    const where: any = {}
    if (module) where.module = module
    if (action) where.action = action
    if (userId) where.userId = userId
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.operationLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, realName: true, username: true },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.operationLog.count({ where }),
    ])

    res.status(200).json(paginatedResponse(items as OperationLog[], total, page, pageSize))
  } catch (error) {
    res.status(500).json(errorResponse(`获取操作日志失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/logs/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const log = await prisma.operationLog.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, realName: true, username: true },
        },
      },
    })

    if (!log) {
      res.status(404).json(errorResponse('日志不存在', 404))
      return
    }

    res.status(200).json(successResponse(log as OperationLog))
  } catch (error) {
    res.status(500).json(errorResponse(`获取日志详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/logs/export', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const startDate = req.query.startDate as string
    const endDate = req.query.endDate as string
    const module = req.query.module as string

    const where: any = {}
    if (module) where.module = module
    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    const logs = await prisma.operationLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, realName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename=operation-logs-${Date.now()}.json`)
    res.status(200).json(successResponse(logs as OperationLog[]))
  } catch (error) {
    res.status(500).json(errorResponse(`导出日志失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/tasks', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const tasks = getTaskList()
    res.status(200).json(successResponse(tasks as TaskInfo[]))
  } catch (error) {
    res.status(500).json(errorResponse(`获取任务列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/tasks/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const task = getTaskById(id)

    if (!task) {
      res.status(404).json(errorResponse('任务不存在', 404))
      return
    }

    res.status(200).json(successResponse(task as TaskInfo))
  } catch (error) {
    res.status(500).json(errorResponse(`获取任务详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/tasks/:id/trigger', authenticate, requireAdmin, operationLogger('system', 'trigger_task'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const success = await triggerTask(id)

    if (!success) {
      res.status(404).json(errorResponse('任务不存在', 404))
      return
    }

    res.status(200).json(successResponse(null, '任务已触发'))
  } catch (error) {
    res.status(500).json(errorResponse(`触发任务失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/tasks/:id/toggle', authenticate, requireAdmin, operationLogger('system', 'toggle_task'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { enabled } = req.body

    if (typeof enabled !== 'boolean') {
      res.status(400).json(errorResponse('enabled 参数必须是布尔值'))
      return
    }

    const success = toggleTask(id, enabled)

    if (!success) {
      res.status(404).json(errorResponse('任务不存在', 404))
      return
    }

    res.status(200).json(successResponse({ enabled }, `任务已${enabled ? '启用' : '停用'}`))
  } catch (error) {
    res.status(500).json(errorResponse(`切换任务状态失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/alerts', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as string
    const level = req.query.level as string

    const where: any = {}
    if (status) where.status = status
    if (level) where.level = level

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.systemAlert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.systemAlert.count({ where }),
    ])

    res.status(200).json(paginatedResponse(items, total, page, pageSize))
  } catch (error) {
    res.status(500).json(errorResponse(`获取系统警报失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/alerts/:id/read', authenticate, operationLogger('system', 'read_alert'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const alert = await prisma.systemAlert.findUnique({ where: { id } })
    if (!alert) {
      res.status(404).json(errorResponse('警报不存在', 404))
      return
    }

    const updatedAlert = await prisma.systemAlert.update({
      where: { id },
      data: { status: 'read' },
    })

    res.status(200).json(successResponse(updatedAlert, '警报已标记为已读'))
  } catch (error) {
    res.status(500).json(errorResponse(`标记警报失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/stats', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [userCount, revenueCount, settlementCount, diffCount, pendingApprovals] = await Promise.all([
      prisma.user.count(),
      prisma.revenueRecord.count(),
      prisma.settlement.count(),
      prisma.reconciliationDiff.count({ where: { status: 'pending' } }),
      prisma.approvalFlow.count({ where: { status: 'pending' } }),
    ])

    const recentLogs = await prisma.operationLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { realName: true } },
      },
    })

    res.status(200).json(successResponse({
      overview: {
        userCount,
        revenueCount,
        settlementCount,
        pendingDiffs: diffCount,
        pendingApprovals,
      },
      recentLogs,
    }))
  } catch (error) {
    res.status(500).json(errorResponse(`获取系统统计失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const role = req.query.role as string

    const where: any = {}
    if (role) where.role = role

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          realName: true,
          role: true,
          email: true,
          phone: true,
          createdAt: true,
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    res.status(200).json(paginatedResponse(items, total, page, pageSize))
  } catch (error) {
    res.status(500).json(errorResponse(`获取用户列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/users', authenticate, requireAdmin, operationLogger('system', 'create_user'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password, realName, role, email, phone } = req.body

    if (!username || !password || !realName || !role || !email || !phone) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      res.status(400).json(errorResponse('用户名已存在'))
      return
    }

    const { hashPassword } = await import('../utils/password.js')
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

    res.status(201).json(successResponse(user, '用户创建成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`创建用户失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/users/:id', authenticate, requireAdmin, operationLogger('system', 'update_user'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { realName, role, email, phone, password } = req.body

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('用户不存在', 404))
      return
    }

    const data: any = {}
    if (realName) data.realName = realName
    if (role) data.role = role
    if (email) data.email = email
    if (phone) data.phone = phone
    if (password) {
      const { hashPassword } = await import('../utils/password.js')
      data.password = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
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

    res.status(200).json(successResponse(user, '用户更新成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`更新用户失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.delete('/users/:id', authenticate, requireAdmin, operationLogger('system', 'delete_user'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    if (id === req.user?.id) {
      res.status(400).json(errorResponse('不能删除自己'))
      return
    }

    const existing = await prisma.user.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('用户不存在', 404))
      return
    }

    await prisma.user.delete({ where: { id } })

    res.status(200).json(successResponse(null, '用户删除成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`删除用户失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
