import { logger } from './logger.js'

export type NotificationType = 'wechat' | 'dingtalk' | 'email'

export interface NotificationMessage {
  title: string
  content: string
  level?: 'info' | 'warning' | 'error' | 'critical'
  atMobiles?: string[]
  atAll?: boolean
}

export interface NotificationResult {
  success: boolean
  message: string
  type: NotificationType
  timestamp: number
}

const sendWechatNotification = async (message: NotificationMessage): Promise<NotificationResult> => {
  logger.info('[模拟] 企业微信通知', {
    title: message.title,
    content: message.content,
    level: message.level,
    atMobiles: message.atMobiles,
    atAll: message.atAll,
  })

  return {
    success: true,
    message: '企业微信通知发送成功（模拟）',
    type: 'wechat',
    timestamp: Date.now(),
  }
}

const sendDingtalkNotification = async (message: NotificationMessage): Promise<NotificationResult> => {
  logger.info('[模拟] 钉钉通知', {
    title: message.title,
    content: message.content,
    level: message.level,
    atMobiles: message.atMobiles,
    atAll: message.atAll,
  })

  return {
    success: true,
    message: '钉钉通知发送成功（模拟）',
    type: 'dingtalk',
    timestamp: Date.now(),
  }
}

const sendEmailNotification = async (message: NotificationMessage): Promise<NotificationResult> => {
  logger.info('[模拟] 邮件通知', {
    title: message.title,
    content: message.content,
    level: message.level,
  })

  return {
    success: true,
    message: '邮件通知发送成功（模拟）',
    type: 'email',
    timestamp: Date.now(),
  }
}

export const sendNotification = async (
  type: NotificationType,
  message: NotificationMessage,
): Promise<NotificationResult> => {
  try {
    switch (type) {
      case 'wechat':
        return await sendWechatNotification(message)
      case 'dingtalk':
        return await sendDingtalkNotification(message)
      case 'email':
        return await sendEmailNotification(message)
      default:
        return {
          success: false,
          message: '未知的通知类型',
          type,
          timestamp: Date.now(),
        }
    }
  } catch (error) {
    logger.error(`发送${type}通知失败`, error)
    return {
      success: false,
      message: `发送${type}通知失败: ${error instanceof Error ? error.message : '未知错误'}`,
      type,
      timestamp: Date.now(),
    }
  }
}

export const sendAlertNotification = async (
  level: 'info' | 'warning' | 'error' | 'critical',
  title: string,
  content: string,
  types: NotificationType[] = ['wechat', 'dingtalk'],
): Promise<NotificationResult[]> => {
  const message: NotificationMessage = {
    title,
    content,
    level,
    atAll: level === 'critical' || level === 'error',
  }

  const promises = types.map((type) => sendNotification(type, message))
  return Promise.all(promises)
}

export const notifyTaskComplete = async (
  taskName: string,
  success: boolean,
  details?: string,
): Promise<NotificationResult[]> => {
  const level = success ? 'info' : 'error'
  const title = success ? `任务完成: ${taskName}` : `任务失败: ${taskName}`
  const content = details || `任务${success ? '已成功完成' : '执行失败'}`

  return sendAlertNotification(level, title, content)
}

export const notifyApprovalRequest = async (
  approvalType: string,
  requester: string,
  amount?: number,
): Promise<NotificationResult[]> => {
  const title = `审批申请: ${approvalType}`
  const content = `${requester} 提交了 ${approvalType} 审批申请${amount ? `，金额: ¥${amount.toLocaleString()}` : ''}，请及时处理。`

  return sendAlertNotification('warning', title, content)
}

export const notifyReconciliationAlert = async (
  diffCount: number,
  diffAmount: number,
  date: string,
): Promise<NotificationResult[]> => {
  const title = '对账异常警报'
  const content = `${date} 对账发现 ${diffCount} 笔差异，差异金额: ¥${diffAmount.toLocaleString()}，请及时处理。`

  return sendAlertNotification('error', title, content)
}

export default {
  sendNotification,
  sendAlertNotification,
  notifyTaskComplete,
  notifyApprovalRequest,
  notifyReconciliationAlert,
}
