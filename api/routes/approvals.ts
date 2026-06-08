import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireFinanceDirector, requireAdmin, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import { notifyTaskComplete } from '../utils/notification.js'
import type { ApprovalFlow, ApprovalStatus } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as ApprovalStatus
    const type = req.query.type as string

    const userRole = req.user!.role
    const where: any = {}
    if (status) where.status = status
    if (type) where.type = type

    if (userRole !== 'admin') {
      where.nodes = {
        some: {
          approverRole: userRole,
        },
      }
    }

    const cacheKey = `approvals:list:${page}:${pageSize}:${status || ''}:${type || ''}:${userRole}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(cachedData)
      return
    }

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.approvalFlow.findMany({
        where,
        include: {
          nodes: {
            orderBy: { level: 'asc' },
            include: {
              approverUser: {
                select: { id: true, realName: true },
              },
            },
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.approvalFlow.count({ where }),
    ])

    const response = paginatedResponse(items as ApprovalFlow[], total, page, pageSize)
    await setCache(cacheKey, response, 5 * 60)

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json(errorResponse(`获取审批列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/pending', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userRole = req.user!.role

    const pendingApprovals = await prisma.approvalFlow.findMany({
      where: {
        status: 'pending',
        nodes: {
          some: {
            approverRole: userRole,
            status: 'pending',
          },
        },
      },
      include: {
        nodes: {
          orderBy: { level: 'asc' },
          include: {
            approverUser: {
              select: { id: true, realName: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json(successResponse(pendingApprovals as ApprovalFlow[]))
  } catch (error) {
    res.status(500).json(errorResponse(`获取待审批列表失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const cacheKey = `approvals:${id}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const approval = await prisma.approvalFlow.findUnique({
      where: { id },
      include: {
        nodes: {
          orderBy: { level: 'asc' },
          include: {
            approverUser: {
              select: { id: true, realName: true },
            },
          },
        },
      },
    })

    if (!approval) {
      res.status(404).json(errorResponse('审批流程不存在', 404))
      return
    }

    await setCache(cacheKey, approval, 10 * 60)

    res.status(200).json(successResponse(approval as ApprovalFlow))
  } catch (error) {
    res.status(500).json(errorResponse(`获取审批详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/approve', authenticate, operationLogger('approvals', 'approve'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { comment } = req.body

    const approval = await prisma.approvalFlow.findUnique({
      where: { id },
      include: { nodes: { orderBy: { level: 'asc' } } },
    })

    if (!approval) {
      res.status(404).json(errorResponse('审批流程不存在', 404))
      return
    }

    if (approval.status !== 'pending') {
      res.status(400).json(errorResponse('该审批已处理完毕'))
      return
    }

    const userRole = req.user!.role
    const currentNode = approval.nodes[approval.currentNode]

    if (!currentNode || currentNode.approverRole !== userRole || currentNode.status !== 'pending') {
      res.status(403).json(errorResponse('您没有权限处理此审批节点', 403))
      return
    }

    await prisma.approvalNode.update({
      where: { id: currentNode.id },
      data: {
        status: 'approved',
        approverId: req.user!.id,
        comment,
        approvedAt: new Date(),
      },
    })

    const nextNodeIndex = approval.currentNode + 1
    let newStatus: 'pending' | 'approved' | 'rejected' = 'pending'

    if (nextNodeIndex >= approval.nodes.length) {
      newStatus = 'approved'

      if (approval.type === 'split_change') {
        await prisma.splitRule.update({
          where: { id: approval.relatedId },
          data: { status: 'active' },
        })
      } else if (approval.type === 'over_budget') {
        await prisma.settlement.update({
          where: { id: approval.relatedId },
          data: { status: 'approved' },
        })
      }
    }

    const updatedFlow = await prisma.approvalFlow.update({
      where: { id },
      data: {
        status: newStatus,
        currentNode: nextNodeIndex,
      },
    })

    if (newStatus === 'approved') {
      await notifyTaskComplete(`审批通过: ${approval.type}`, true)
    }

    await deleteCacheByPattern('approvals:*')
    await deleteCacheByPattern('split-rules:*')
    await deleteCacheByPattern('settlements:*')

    res.status(200).json(successResponse(updatedFlow as ApprovalFlow, '审批通过'))
  } catch (error) {
    res.status(500).json(errorResponse(`审批失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/reject', authenticate, operationLogger('approvals', 'reject'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { comment } = req.body

    if (!comment) {
      res.status(400).json(errorResponse('请填写驳回原因'))
      return
    }

    const approval = await prisma.approvalFlow.findUnique({
      where: { id },
      include: { nodes: { orderBy: { level: 'asc' } } },
    })

    if (!approval) {
      res.status(404).json(errorResponse('审批流程不存在', 404))
      return
    }

    if (approval.status !== 'pending') {
      res.status(400).json(errorResponse('该审批已处理完毕'))
      return
    }

    const userRole = req.user!.role
    const currentNode = approval.nodes[approval.currentNode]

    if (!currentNode || currentNode.approverRole !== userRole || currentNode.status !== 'pending') {
      res.status(403).json(errorResponse('您没有权限处理此审批节点', 403))
      return
    }

    await prisma.approvalNode.update({
      where: { id: currentNode.id },
      data: {
        status: 'rejected',
        approverId: req.user!.id,
        comment,
        approvedAt: new Date(),
      },
    })

    const updatedFlow = await prisma.approvalFlow.update({
      where: { id },
      data: { status: 'rejected' },
    })

    if (approval.type === 'split_change') {
      await prisma.splitRule.update({
        where: { id: approval.relatedId },
        data: { status: 'draft' },
      })
    } else if (approval.type === 'over_budget') {
      await prisma.settlement.update({
        where: { id: approval.relatedId },
        data: { status: 'rejected' },
      })
    }

    await notifyTaskComplete(`审批驳回: ${approval.type}`, false, comment)
    await deleteCacheByPattern('approvals:*')
    await deleteCacheByPattern('split-rules:*')
    await deleteCacheByPattern('settlements:*')

    res.status(200).json(successResponse(updatedFlow as ApprovalFlow, '审批已驳回'))
  } catch (error) {
    res.status(500).json(errorResponse(`驳回失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.delete('/:id', authenticate, requireAdmin, operationLogger('approvals', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const existing = await prisma.approvalFlow.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('审批流程不存在', 404))
      return
    }

    if (existing.status === 'pending') {
      res.status(400).json(errorResponse('待审批状态的流程无法删除'))
      return
    }

    await prisma.approvalFlow.delete({ where: { id } })

    await deleteCacheByPattern('approvals:*')

    res.status(200).json(successResponse(null, '审批流程删除成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`删除失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router