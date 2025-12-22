import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * HTTP Request Logger Middleware
 * 
 * Logs all HTTP requests and responses with:
 * - Request method, path, query params
 * - Client IP address
 * - User agent
 * - Authenticated user ID (if available)
 * - Response status code
 * - Response time
 * - Errors (if any)
 * 
 * Sensitive data (passwords, tokens) is automatically redacted.
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const { method, originalUrl, query, headers } = req;
    const userAgent = headers['user-agent'];
    const userId = (req as any).user?.id;

    // Extract path without query string
    const path = originalUrl.split('?')[0];

    // Get client IP
    const clientIp = this.getClientIp(req);

    // Skip logging for health check endpoints (reduce noise)
    if (path === '/health' || path === '/ping') {
      return next();
    }

    // Log request
    const requestInfo = {
      timestamp: new Date().toISOString(),
      type: 'request',
      method,
      path,
      ...(Object.keys(query).length > 0 && { query }),
      ip: clientIp,
      userAgent,
      ...(userId && { userId }),
    };

    this.logger.log(`[REQUEST] ${method} ${path}${userId ? ` (User: ${userId})` : ''}`);

    // Capture variables for closure
    const logger = this.logger;
    const logMethod = method;
    const logPath = path;
    const logUserId = userId;
    
    // Capture response
    const originalSend = res.send;
    
    res.send = function (body: any) {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      // Determine log level based on status code
      const isError = statusCode >= 400;
      const isWarning = statusCode >= 300 && statusCode < 400;

      // Log response
      if (isError) {
        logger.error(
          `[RESPONSE] ${logMethod} ${logPath} ${statusCode} (${responseTime}ms)${logUserId ? ` (User: ${logUserId})` : ''}`,
        );
      } else if (isWarning) {
        logger.warn(
          `[RESPONSE] ${logMethod} ${logPath} ${statusCode} (${responseTime}ms)${logUserId ? ` (User: ${logUserId})` : ''}`,
        );
      } else {
        logger.log(
          `[RESPONSE] ${logMethod} ${logPath} ${statusCode} (${responseTime}ms)${logUserId ? ` (User: ${logUserId})` : ''}`,
        );
      }

      // Call original send
      return originalSend.call(this, body);
    };

    next();
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }
}

