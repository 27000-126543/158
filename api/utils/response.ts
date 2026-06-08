import type { ApiResponse } from '@shared/types/index.js'

export const successResponse = <T>(data: T, message: string = 'success'): ApiResponse<T> => {
  return {
    code: 200,
    message,
    data,
    timestamp: Date.now(),
  }
}

export const errorResponse = (message: string, code: number = 400): ApiResponse<null> => {
  return {
    code,
    message,
    data: null,
    timestamp: Date.now(),
  }
}

export const createdResponse = <T>(data: T, message: string = '创建成功'): ApiResponse<T> => {
  return {
    code: 201,
    message,
    data,
    timestamp: Date.now(),
  }
}

export const paginatedResponse = <T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
  message: string = 'success',
): ApiResponse<{ items: T[]; total: number; page: number; pageSize: number; totalPages: number }> => {
  return {
    code: 200,
    message,
    data: {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
    timestamp: Date.now(),
  }
}

export default {
  successResponse,
  errorResponse,
  createdResponse,
  paginatedResponse,
}
