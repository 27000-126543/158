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
import { dashboardRouter, monthlyReportsRouter } from './routes/reports.js'
import approvalsRoutes from './routes/approvals.js'
import systemRoutes from './routes/system.js'
import purchasesRoutes from './routes/purchases.js'
import suppliersRoutes from './routes/suppliers.js'
import inquiriesRoutes from './routes/inquiries.js'
import ordersRoutes from './routes/orders.js'

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
app.use('/api/dashboard', dashboardRouter)
app.use('/api/monthly-reports', monthlyReportsRouter)
app.use('/api/approvals', approvalsRoutes)
app.use('/api/system', systemRoutes)
app.use('/api/purchases', purchasesRoutes)
app.use('/api/suppliers', suppliersRoutes)
app.use('/api/inquiries', inquiriesRoutes)
app.use('/api', ordersRoutes)

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
