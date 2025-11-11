import winston from 'winston';
import type { LogLevel } from '../settings.js';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
    return `${timestamp} - ${level.toUpperCase()} - ${message}${stack ? '\n' + stack : ''}${metaStr ? ' ' + metaStr : ''}`;
  })
);

export function setupLogging(logLevel: LogLevel = 'INFO'): winston.Logger {
  const logger = winston.createLogger({
    level: logLevel.toLowerCase(),
    format: logFormat,
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          logFormat
        ),
      }),
    ],
  });

  return logger;
}

export type Logger = winston.Logger;

