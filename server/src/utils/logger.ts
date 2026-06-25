type Level = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

const LEVEL_ORDER: Record<Level, number> = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 }

const MIN_LEVEL: Level = (process.env.LOG_LEVEL as Level) ?? 'DEBUG'

function beijingTimestamp(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false })
}

function shouldLog(level: Level): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL]
}

function format(level: Level, ctx: string, message: string, data?: unknown): string {
  const ts = beijingTimestamp()
  const head = `[${ts}] [${level.padEnd(5)}] [${ctx}]`
  if (data !== undefined) {
    const extra = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    return `${head} ${message}\n${extra}`
  }
  return `${head} ${message}`
}

export interface Logger {
  debug(msg: string, data?: unknown): void
  info(msg: string, data?: unknown): void
  warn(msg: string, data?: unknown): void
  error(msg: string, data?: unknown): void
}

/** 创建带上下文的日志记录器 */
export function createLogger(ctx: string): Logger {
  return {
    debug(msg, data) {
      if (shouldLog('DEBUG')) console.debug(format('DEBUG', ctx, msg, data))
    },
    info(msg, data) {
      if (shouldLog('INFO')) console.info(format('INFO', ctx, msg, data))
    },
    warn(msg, data) {
      if (shouldLog('WARN')) console.warn(format('WARN', ctx, msg, data))
    },
    error(msg, data) {
      if (shouldLog('ERROR')) console.error(format('ERROR', ctx, msg, data))
    },
  }
}
