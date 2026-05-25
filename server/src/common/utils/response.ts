// server/src/common/utils/response.ts
export const ok         = (data: unknown, message = 'success') => ({ success: true, data, message })
export const paginated  = (data: unknown, total: number, page: number, limit: number) =>
  ({ success: true, data, pagination: { page, limit, total } })
export const fail       = (code: string, message: string) => ({ success: false, error: { code, message } })
