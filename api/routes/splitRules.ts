import { Router, type Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { successResponse, errorResponse, createdResponse, paginatedResponse } from '../utils/response.js'
import { authenticate, requireFinanceDirector, requireAdmin, type AuthRequest } from '../middleware/auth.middleware.js'
import { operationLogger } from '../middleware/logger.middleware.js'
import { getCache, setCache, deleteCacheByPattern } from '../utils/redis.js'
import { notifyApprovalRequest } from '../utils/notification.js'
import type { SplitRule, SplitRuleHistory, RuleStatus } from '@shared/types/index.js'

const router = Router()
const prisma = new PrismaClient()

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const pageSize = parseInt(req.query.pageSize as string) || 20
    const status = req.query.status as RuleStatus
    const businessLine = req.query.businessLine as string

    const cacheKey = `split-rules:list:${page}:${pageSize}:${status || ''}:${businessLine || ''}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(cachedData)
      return
    }

    const where: any = {}
    if (status) where.status = status
    if (businessLine) where.businessLine = businessLine

    const skip = (page - 1) * pageSize
    const [items, total] = await Promise.all([
      prisma.splitRule.findMany({
        where,
        include: {
          history: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.splitRule.count({ where }),
    ])

    const response = paginatedResponse(items as SplitRule[], total, page, pageSize)
    await setCache(cacheKey, response, 5 * 60)

    res.status(200).json(response)
  } catch (error) {
    res.status(500).json(errorResponse(`获取分成规则失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const cacheKey = `split-rules:${id}`
    const cachedData = await getCache(cacheKey)
    if (cachedData) {
      res.status(200).json(successResponse(cachedData))
      return
    }

    const rule = await prisma.splitRule.findUnique({
      where: { id },
      include: {
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!rule) {
      res.status(404).json(errorResponse('分成规则不存在', 404))
      return
    }

    await setCache(cacheKey, rule, 10 * 60)

    res.status(200).json(successResponse(rule as SplitRule))
  } catch (error) {
    res.status(500).json(errorResponse(`获取分成规则详情失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/', authenticate, requireFinanceDirector, operationLogger('split-rules', 'create'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { businessLine, ratios, effectiveDate, expiryDate } = req.body

    if (!businessLine || !ratios || !effectiveDate) {
      res.status(400).json(errorResponse('缺少必要参数'))
      return
    }

    const existing = await prisma.splitRule.findUnique({ where: { businessLine } })
    if (existing) {
      res.status(400).json(errorResponse('该业务线已有规则，请使用更新功能'))
      return
    }

    const rule = await prisma.splitRule.create({
      data: {
        businessLine,
        ratios,
        effectiveDate: new Date(effectiveDate),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: 'draft',
        version: 1,
        createdBy: req.user!.id,
      },
    })

    await deleteCacheByPattern('split-rules:*')

    res.status(201).json(createdResponse(rule as SplitRule, '分成规则创建成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`创建分成规则失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.put('/:id', authenticate, requireFinanceDirector, operationLogger('split-rules', 'update'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params
    const { ratios, effectiveDate, expiryDate, changeReason } = req.body

    const existing = await prisma.splitRule.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('分成规则不存在', 404))
      return
    }

    await prisma.splitRuleHistory.create({
      data: {
        ruleId: id,
        oldRatios: existing.ratios,
        newRatios: ratios || existing.ratios,
        changeReason: changeReason || '更新规则',
        changedBy: req.user!.id,
      },
    })

    const data: any = {}
    if (ratios) data.ratios = ratios
    if (effectiveDate) data.effectiveDate = new Date(effectiveDate)
    if (expiryDate !== undefined) data.expiryDate = expiryDate ? new Date(expiryDate) : null
    data.version = existing.version + 1

    const rule = await prisma.splitRule.update({
      where: { id },
      data,
    })

    await deleteCacheByPattern('split-rules:*')

    res.status(200).json(successResponse(rule as SplitRule, '分成规则更新成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`更新分成规则失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.post('/:id/submit-approval', authenticate, requireFinanceDirector, operationLogger('split-rules', 'submit_approval'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const rule = await prisma.splitRule.findUnique({ where: { id } })
    if (!rule) {
      res.status(404).json(errorResponse('分成规则不存在', 404))
      return
    }

    if (rule.status !== 'draft') {
      res.status(400).json(errorResponse('只有草稿状态的规则可以提交审批'))
      return
    }

    const approvalFlow = await prisma.approvalFlow.create({
      data: {
        type: 'split_change',
        status: 'pending',
        currentNode: 0,
        relatedId: id,
        nodes: {
          create: [
            { level: 1, approverRole: 'finance_director', status: 'pending' },
            { level: 2, approverRole: 'admin', status: 'pending' },
          ],
        },
      },
    })

    const updatedRule = await prisma.splitRule.update({
      where: { id },
      data: {
        status: 'pending_approval',
        approvalFlowId: approvalFlow.id,
      },
    })

    await notifyApprovalRequest('分成规则变更', req.user!.username)
    await deleteCacheByPattern('split-rules:*')

    res.status(200).json(successResponse(updatedRule as SplitRule, '已提交审批'))
  } catch (error) {
    res.status(500).json(errorResponse(`提交审批失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.delete('/:id', authenticate, requireAdmin, operationLogger('split-rules', 'delete'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const existing = await prisma.splitRule.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json(errorResponse('分成规则不存在', 404))
      return
    }

    if (existing.status === 'active') {
      res.status(400).json(errorResponse('启用状态的规则无法删除，请先停用'))
      return
    }

    await prisma.splitRule.delete({ where: { id } })

    await deleteCacheByPattern('split-rules:*')

    res.status(200).json(successResponse(null, '分成规则删除成功'))
  } catch (error) {
    res.status(500).json(errorResponse(`删除分成规则失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

router.get('/:id/history', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params

    const history = await prisma.splitRuleHistory.findMany({
      where: { ruleId: id },
      orderBy: { createdAt: 'desc' },
    })

    res.status(200).json(successResponse(history as SplitRuleHistory[]))
  } catch (error) {
    res.status(500).json(errorResponse(`获取变更历史失败: ${error instanceof Error ? error.message : '未知错误'}`, 500))
  }
})

export default router
