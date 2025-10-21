/**
 * 專案日誌系統
 * 替代 console.log，提供統一的日誌管理
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug'

interface LogEntry {
  timestamp: string
  module: string
  level: LogLevel
  message: string
  args?: unknown[]
}

class Logger {
  private module: string
  private static readonly MAX_LOGS = 100 // 最多保留 100 條日誌
  private static readonly STORAGE_KEY = 'app_logs'

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
    } else {
      // 生產環境：僅輸出 error 和 warn 到 console
      if (level === 'error' || level === 'warn') {
        const consoleFn = level === 'error' ? console.error : console.warn
        consoleFn(prefix, message, ...args)
      }

      // 生產環境日誌收集：存儲到 localStorage
      this.storeLog({ timestamp, module: this.module, level, message, args })
    }
  }

  private storeLog(entry: LogEntry) {
    try {
      if (typeof window === 'undefined') return

      const stored = localStorage.getItem(Logger.STORAGE_KEY)
      const logs: LogEntry[] = stored ? JSON.parse(stored) : []

      // 添加新日誌
      logs.push(entry)

      // 只保留最近的 N 條日誌
      const trimmedLogs = logs.slice(-Logger.MAX_LOGS)

      localStorage.setItem(Logger.STORAGE_KEY, JSON.stringify(trimmedLogs))
    } catch (error) {
      // localStorage 可能被禁用或已滿，靜默失敗
      console.error('無法存儲日誌:', error)
    }
  }

  /**
   * 獲取存儲的日誌（用於除錯）
   */
  static getLogs(): LogEntry[] {
    try {
      if (typeof window === 'undefined') return []
      const stored = localStorage.getItem(Logger.STORAGE_KEY)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  /**
   * 清除存儲的日誌
   */
  static clearLogs() {
    try {
      if (typeof window === 'undefined') return
      localStorage.removeItem(Logger.STORAGE_KEY)
    } catch (error) {
      console.error('無法清除日誌:', error)
    }
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

// 導出 Logger 類別供自定義使用和訪問靜態方法
export default Logger
export { Logger }
