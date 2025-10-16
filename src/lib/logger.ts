/**
 * 專案日誌系統
 * 替代 console.log，提供統一的日誌管理
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

class Logger {
  private module: string

  constructor(module: string) {
    this.module = module
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString()
    const prefix = `[${timestamp}] [${this.module}] [${level.toUpperCase()}]`

    // 在開發環境中輸出到 console
    if (process.env.NODE_ENV === 'development') {
      switch (level) {
        case 'error':
          console.error(prefix, message, ...args)
          break
        case 'warn':
          console.warn(prefix, message, ...args)
          break
        case 'debug':
          console.debug(prefix, message, ...args)
          break
        default:
          console.log(prefix, message, ...args)
      }
    }

    // 在生產環境可以發送到日誌服務（未來擴展）
    // TODO: 實作生產環境日誌收集
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args)
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args)
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args)
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args)
  }
}

// 預定義的 logger 實例
export const apiLogger = new Logger('API')
export const clientLogger = new Logger('Client')
export const storageLogger = new Logger('Storage')

// 導出 Logger 類別供自定義使用
export default Logger
