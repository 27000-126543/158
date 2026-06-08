import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import path from 'path'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { requestLogger } from './middleware/logger.middleware.js'
import { apiRateLimit } from './middleware/rateLimit.middleware.js'
import { successResponse, errorResponse } from './utils/response.js'
import { logger } from './utils/logger.js'
import { initScheduler } from './scheduler.js'

import authRoutes from './routes/auth.js'
import revenueRoutes from './routes/revenue.js'
import splitRulesRoutes from './routes/splitRules.js'
import settlementsRoutes from './routes/settlements.js'
import reconciliationRoutes from './routes/reconciliation.js'
import reportsRoutes from './routes/reports.js'
import approvalsRoutes from './routes/approvals.js'
import systemRoutes from './routes/system.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use(requestLogger)
app.use(apiRateLimit)

app.use('/api/auth', authRoutes)
app.use('/api/revenue', revenueRoutes)
app.use('/api/split-rules', splitRulesRoutes)
app.use('/api/settlements', settlementsRoutes)
app.use('/api/reconciliation', reconciliationRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/system', systemRoutes)

app.use(
  '/api/health',
  (req: Request, res: Response): void => {
    res.status(200).json(successResponse({ status: 'ok', timestamp: new Date().toISOString() }))
  },
)

app.use((error: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('服务器内部错误', error)
  res.status(500).json(errorResponse(`服务器内部错误: ${error.message}`, 500))
})

app.use((req: Request, res: Response): void => {
  res.status(404).json(errorResponse('API 接口不存在', 404))
})

initScheduler()

export default app
