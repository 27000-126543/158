import cron from 'node-cron'
import { logger } from './utils/logger.js'
import { notifyTaskComplete, notifyReconciliationAlert } from './utils/notification.js'
import type { TaskInfo } from '@shared/types/index.js'

export interface ScheduledTask {
  id: string
  name: string
  cronExpression: string
  description: string
  task: () => Promise<void>
  enabled: boolean
  lastRunAt?: Date
  nextRunAt?: Date
  lastStatus?: 'success' | 'failed'
  status: 'running' | 'idle' | 'error'
}

const tasks: ScheduledTask[] = [
  {
    id: 'revenue-capture',
    name: '每日流水抓取',
    cronExpression: '0 1 * * *',
    description: '每日凌晨1点执行收入流水抓取任务',
    enabled: true,
    status: 'idle',
    task: async () => {
      logger.info('开始执行每日流水抓取任务')
      await new Promise((resolve) => setTimeout(resolve, 2000))
      logger.info('每日流水抓取任务完成')
    },
  },
  {
    id: 'settlement-generation',
    name: '结算单生成',
    cronExpression: '0 2 * * *',
    description: '每日凌晨2点执行结算单生成任务',
    enabled: true,
    status: 'idle',
    task: async () => {
      logger.info('开始执行结算单生成任务')
      await new Promise((resolve) => setTimeout(resolve, 3000))
      logger.info('结算单生成任务完成')
    },
  },
  {
    id: 'bank-reconciliation',
    name: '银行对账',
    cronExpression: '0 3 * * *',
    description: '每日凌晨3点执行银行对账任务',
    enabled: true,
    status: 'idle',
    task: async () => {
      logger.info('开始执行银行对账任务')
      await new Promise((resolve) => setTimeout(resolve, 5000))

      const diffCount = Math.floor(Math.random() * 5)
      const diffAmount = Math.floor(Math.random() * 10000)

      if (diffCount > 0) {
        const today = new Date().toLocaleDateString('zh-CN')
        await notifyReconciliationAlert(diffCount, diffAmount, today)
        logger.warn(`银行对账发现 ${diffCount} 笔差异，金额: ¥${diffAmount}`)
      }

      logger.info('银行对账任务完成')
    },
  },
  {
    id: 'monthly-report',
    name: '月度报告生成',
    cronExpression: '0 4 1 * *',
    description: '每月1号凌晨4点执行月度报告生成任务',
    enabled: true,
    status: 'idle',
    task: async () => {
      logger.info('开始执行月度报告生成任务')
      await new Promise((resolve) => setTimeout(resolve, 10000))
      logger.info('月度报告生成任务完成')
    },
  },
]

const scheduledTasks: Map<string, cron.ScheduledTask> = new Map()

const wrapTask = (taskDef: ScheduledTask) => {
  return async () => {
    const startTime = Date.now()
    taskDef.status = 'running'
    taskDef.lastRunAt = new Date()

    logger.info(`[定时任务] 开始执行: ${taskDef.name}`)

    try {
      await taskDef.task()
      taskDef.lastStatus = 'success'
      taskDef.status = 'idle'
      const duration = Date.now() - startTime
      logger.info(`[定时任务] 执行完成: ${taskDef.name}，耗时: ${duration}ms`)
      await notifyTaskComplete(taskDef.name, true)
    } catch (error) {
      taskDef.lastStatus = 'failed'
      taskDef.status = 'error'
      const duration = Date.now() - startTime
      logger.error(`[定时任务] 执行失败: ${taskDef.name}，耗时: ${duration}ms`, error)
      await notifyTaskComplete(taskDef.name, false, error instanceof Error ? error.message : '未知错误')
    }

    updateNextRunTime(taskDef)
  }
}

const updateNextRunTime = (taskDef: ScheduledTask): void => {
  const task = scheduledTasks.get(taskDef.id)
  if (task) {
    try {
      const now = new Date()
      const cronParts = taskDef.cronExpression.split(' ')
      if (cronParts.length >= 5) {
        const nextRun = new Date(now)
        nextRun.setHours(parseInt(cronParts[1]), parseInt(cronParts[0]), 0, 0)
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        taskDef.nextRunAt = nextRun
      }
    } catch (error) {
      logger.warn('获取下次运行时间失败', error)
    }
  }
}

export const initScheduler = (): void => {
  logger.info('正在初始化定时任务调度器...')

  tasks.forEach((taskDef) => {
    if (taskDef.enabled) {
      const task = cron.schedule(taskDef.cronExpression, wrapTask(taskDef), {
        scheduled: true,
        timezone: 'Asia/Shanghai',
      })

      scheduledTasks.set(taskDef.id, task)
      updateNextRunTime(taskDef)

      logger.info(`[定时任务] 已注册: ${taskDef.name} - ${taskDef.cronExpression}`)
    }
  })

  logger.info(`定时任务调度器初始化完成，共注册 ${scheduledTasks.size} 个任务`)
}

export const startScheduler = (): void => {
  scheduledTasks.forEach((task, id) => {
    task.start()
    const taskDef = tasks.find((t) => t.id === id)
    if (taskDef) {
      updateNextRunTime(taskDef)
    }
  })
  logger.info('定时任务调度器已启动')
}

export const stopScheduler = (): void => {
  scheduledTasks.forEach((task) => {
    task.stop()
  })
  logger.info('定时任务调度器已停止')
}

export const getTaskList = (): TaskInfo[] => {
  return tasks.map((task) => ({
    id: task.id,
    name: task.name,
    cronExpression: task.cronExpression,
    lastRunAt: task.lastRunAt,
    nextRunAt: task.nextRunAt,
    status: task.status,
    lastStatus: task.lastStatus,
    description: task.description,
  }))
}

export const getTaskById = (id: string): TaskInfo | undefined => {
  const task = tasks.find((t) => t.id === id)
  if (!task) return undefined
  return {
    id: task.id,
    name: task.name,
    cronExpression: task.cronExpression,
    lastRunAt: task.lastRunAt,
    nextRunAt: task.nextRunAt,
    status: task.status,
    lastStatus: task.lastStatus,
    description: task.description,
  }
}

export const triggerTask = async (id: string): Promise<boolean> => {
  const taskDef = tasks.find((t) => t.id === id)
  if (!taskDef) return false

  logger.info(`[定时任务] 手动触发: ${taskDef.name}`)
  await wrapTask(taskDef)()
  return true
}

export const toggleTask = (id: string, enabled: boolean): boolean => {
  const taskDef = tasks.find((t) => t.id === id)
  if (!taskDef) return false

  const task = scheduledTasks.get(id)
  if (!task) return false

  if (enabled) {
    task.start()
    taskDef.enabled = true
    updateNextRunTime(taskDef)
    logger.info(`[定时任务] 已启用: ${taskDef.name}`)
  } else {
    task.stop()
    taskDef.enabled = false
    logger.info(`[定时任务] 已停用: ${taskDef.name}`)
  }

  return true
}

export default {
  initScheduler,
  startScheduler,
  stopScheduler,
  getTaskList,
  getTaskById,
  triggerTask,
  toggleTask,
}
