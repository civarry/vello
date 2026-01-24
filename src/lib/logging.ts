/**
 * Structured logging utility for API routes.
 * In production, this should integrate with a logging service (e.g., Sentry, LogRocket).
 */

export interface LogContext {
  userId?: string;
  organizationId?: string;
  action?: string;
  [key: string]: unknown;
}

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

/**
 * Formats a log entry for output.
 */
function formatLogEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level}]`,
    entry.message,
  ];

  if (entry.context) {
    parts.push(JSON.stringify(entry.context));
  }

  if (entry.error) {
    parts.push(`Error: ${entry.error.message}`);
    if (entry.error.stack) {
      parts.push(`Stack: ${entry.error.stack}`);
    }
  }

  return parts.join(" ");
}

/**
 * Logs a message with optional context.
 */
export function log(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): void {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    ...(error && {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
    }),
  };

  const formatted = formatLogEntry(entry);

  switch (level) {
    case LogLevel.DEBUG:
      if (process.env.NODE_ENV === "development") {
        console.debug(formatted);
      }
      break;
    case LogLevel.INFO:
      console.info(formatted);
      break;
    case LogLevel.WARN:
      console.warn(formatted);
      break;
    case LogLevel.ERROR:
      console.error(formatted);
      // In production, send to error tracking service
      if (process.env.NODE_ENV === "production" && error) {
        // TODO: Integrate with error tracking service
        // Example: Sentry.captureException(error, { extra: context });
      }
      break;
  }
}

/**
 * Logs an info message.
 */
export function logInfo(message: string, context?: LogContext): void {
  log(LogLevel.INFO, message, context);
}

/**
 * Logs a warning message.
 */
export function logWarn(message: string, context?: LogContext): void {
  log(LogLevel.WARN, message, context);
}

/**
 * Logs an error message.
 */
export function logError(
  message: string,
  error?: Error,
  context?: LogContext
): void {
  log(LogLevel.ERROR, message, context, error);
}

/**
 * Logs a debug message (only in development).
 */
export function logDebug(message: string, context?: LogContext): void {
  log(LogLevel.DEBUG, message, context);
}
