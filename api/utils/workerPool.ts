import { Worker } from 'worker_threads'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from './logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface WorkerTask<T = unknown> {
  id: string
  type: string
  data: T
  priority?: number
}

export interface WorkerResult<T = unknown> {
  taskId: string
  success: boolean
  data?: T
  error?: string
  duration: number
}

interface PoolWorker {
  worker: Worker
  busy: boolean
  currentTask?: WorkerTask
}

export class WorkerPool {
  private workers: PoolWorker[] = []
  private taskQueue: { task: WorkerTask; resolve: (value: WorkerResult) => void; reject: (reason: unknown) => void }[] = []
  private maxWorkers: number
  private workerScript: string

  constructor(maxWorkers: number = Math.max(2, os.cpus().length - 1), workerScript: string) {
    this.maxWorkers = maxWorkers
    this.workerScript = workerScript
    this.initializeWorkers()
  }

  private initializeWorkers(): void {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.createWorker()
    }
    logger.info(`Worker池初始化完成，共 ${this.maxWorkers} 个Worker`)
  }

  private createWorker(): void {
    const worker = new Worker(this.workerScript)

    worker.on('message', (result: WorkerResult) => {
      const poolWorker = this.workers.find((w) => w.worker === worker)
      if (poolWorker) {
        poolWorker.busy = false
        poolWorker.currentTask = undefined
      }
      this.processQueue()
    })

    worker.on('error', (error) => {
      logger.error('Worker发生错误', error)
      const poolWorker = this.workers.find((w) => w.worker === worker)
      if (poolWorker) {
        poolWorker.busy = false
        poolWorker.currentTask = undefined
      }
      this.removeWorker(worker)
      this.createWorker()
      this.processQueue()
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.warn(`Worker意外退出，退出码: ${code}`)
        this.removeWorker(worker)
        this.createWorker()
        this.processQueue()
      }
    })

    this.workers.push({ worker, busy: false })
  }

  private removeWorker(worker: Worker): void {
    const index = this.workers.findIndex((w) => w.worker === worker)
    if (index > -1) {
      void this.workers[index].worker.terminate()
      this.workers.splice(index, 1)
    }
  }

  private processQueue(): void {
    if (this.taskQueue.length === 0) return

    const availableWorker = this.workers.find((w) => !w.busy)
    if (!availableWorker) return

    const queued = this.taskQueue.shift()
    if (queued) {
      this.runTask(queued.task, queued.resolve, queued.reject)
    }
  }

  private runTask<T>(
    task: WorkerTask<T>,
    resolve: (value: WorkerResult<T>) => void,
    reject: (reason: unknown) => void,
  ): void {
    const availableWorker = this.workers.find((w) => !w.busy)
    if (!availableWorker) {
      reject(new Error('没有可用的Worker'))
      return
    }

    availableWorker.busy = true
    availableWorker.currentTask = task

    const startTime = Date.now()

    const onMessage = (result: WorkerResult<T>) => {
      if (result.taskId === task.id) {
        availableWorker.worker.removeListener('message', onMessage)
        availableWorker.worker.removeListener('error', onError)
        resolve({
          ...result,
          duration: Date.now() - startTime,
        })
      }
    }

    const onError = (error: Error) => {
      availableWorker.worker.removeListener('message', onMessage)
      availableWorker.worker.removeListener('error', onError)
      reject(error)
    }

    availableWorker.worker.on('message', onMessage)
    availableWorker.worker.once('error', onError)
    availableWorker.worker.postMessage(task)
  }

  public async execute<T>(task: WorkerTask<T>): Promise<WorkerResult<T>> {
    const availableWorker = this.workers.find((w) => !w.busy)

    if (availableWorker) {
      return new Promise<WorkerResult<T>>((resolve, reject) => {
        this.runTask(task, resolve, reject)
      })
    }

    return new Promise<WorkerResult<T>>((resolve, reject) => {
      this.taskQueue.push({
        task: task as WorkerTask<unknown>,
        resolve: resolve as (value: WorkerResult<unknown>) => void,
        reject,
      })
      this.taskQueue.sort((a, b) => (b.task.priority || 0) - (a.task.priority || 0))
    })
  }

  public getStats(): {
    totalWorkers: number
    busyWorkers: number
    idleWorkers: number
    queueLength: number
    activeTasks: WorkerTask[]
  } {
    const busyWorkers = this.workers.filter((w) => w.busy).length
    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      idleWorkers: this.workers.length - busyWorkers,
      queueLength: this.taskQueue.length,
      activeTasks: this.workers.filter((w) => w.currentTask).map((w) => w.currentTask!),
    }
  }

  public async shutdown(): Promise<void> {
    logger.info('正在关闭Worker池...')
    const promises = this.workers.map((w) => w.worker.terminate())
    await Promise.all(promises)
    this.workers = []
    this.taskQueue = []
    logger.info('Worker池已关闭')
  }
}

export const createWorkerPool = (maxWorkers?: number, workerScript?: string): WorkerPool => {
  const script = workerScript || path.join(__dirname, 'worker.js')
  return new WorkerPool(maxWorkers, script)
}

export default WorkerPool
