/**
 * Logger utility
 */

import winston from 'winston';
import path from 'path';
import { config } from '../config';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: config.logging.format === 'json' 
      ? logFormat
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
  })
];

if (config.logging.logToFile) {
  transports.push(
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'combined.log')
    })
  );
}

export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'exceptions.log')
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.logDir, 'rejections.log')
    })
  ]
});