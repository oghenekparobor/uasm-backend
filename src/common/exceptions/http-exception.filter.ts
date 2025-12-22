import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

export interface ErrorResponse {
  statusCode: number;
  timestamp: string;
  path: string;
  method: string;
  message: string | string[];
  error?: string;
  details?: any;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | string[];
    let error: string | undefined;
    let details: any | undefined;

    if (exception instanceof HttpException) {
      // Handle NestJS HTTP exceptions
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || exception.message;
        error = (exceptionResponse as any).error;
        details = (exceptionResponse as any).details;
        // Include validation errors if present
        if ((exceptionResponse as any).errors) {
          details = { ...details, errors: (exceptionResponse as any).errors };
        }
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // Handle Prisma known errors
      const prismaError = this.mapPrismaError(exception);
      status = prismaError.status;
      message = prismaError.message;
      error = prismaError.error;
      details = prismaError.details;
    } else if (exception instanceof Error && exception.message.includes('row-level security')) {
      // Handle RLS permission errors
      status = HttpStatus.FORBIDDEN;
      message = 'You do not have permission to perform this action';
      error = 'Forbidden';
      this.logger.warn(`RLS blocked action: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      // Handle Prisma validation errors
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation error occurred';
      error = 'Bad Request';
      details = {
        originalMessage: exception.message,
      };
    } else if (exception instanceof Prisma.PrismaClientInitializationError) {
      // Handle Prisma initialization errors
      status = HttpStatus.SERVICE_UNAVAILABLE;
      message = 'Database connection error';
      error = 'Service Unavailable';
      this.logger.error('Prisma initialization error:', exception);
    } else if (exception instanceof Prisma.PrismaClientRustPanicError) {
      // Handle Prisma panic errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected database error occurred';
      error = 'Internal Server Error';
      this.logger.error('Prisma panic error:', exception);
    } else {
      // Handle unknown errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'An unexpected error occurred';
      error = 'Internal Server Error';
      this.logger.error('Unhandled exception:', exception);
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(error && { error }),
      ...(details && { details }),
    };

    // Log error for debugging (but don't expose sensitive info)
    if (status >= 500) {
      this.logger.error(
        `HTTP ${status} Error: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(`HTTP ${status} Error: ${message}`);
    }

    response.status(status).json(errorResponse);
  }

  private mapPrismaError(
    error: Prisma.PrismaClientKnownRequestError,
  ): {
    status: number;
    message: string;
    error?: string;
    details?: any;
  } {
    const { code, meta } = error;

    switch (code) {
      case 'P2002':
        // Unique constraint violation
        return {
          status: HttpStatus.CONFLICT,
          message: this.getUniqueConstraintMessage(meta),
          error: 'Conflict',
          details: {
            field: (meta as any)?.target,
          },
        };

      case 'P2025':
        // Record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'Not Found',
        };

      case 'P2003':
        // Foreign key constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid reference: related record does not exist',
          error: 'Bad Request',
          details: {
            field: (meta as any)?.field_name,
          },
        };

      case 'P2014':
        // Required relation violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required relation is missing',
          error: 'Bad Request',
        };

      case 'P2011':
        // Null constraint violation
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Required field cannot be null',
          error: 'Bad Request',
          details: {
            field: (meta as any)?.field_name,
          },
        };

      case 'P2012':
        // Value out of range
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Value is out of range',
          error: 'Bad Request',
        };

      case 'P2015':
        // Related record not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Related record not found',
          error: 'Not Found',
        };

      case 'P2016':
        // Query interpretation error
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid query parameters',
          error: 'Bad Request',
        };

      case 'P2017':
        // Records for relation not connected
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Records are not connected',
          error: 'Bad Request',
        };

      case 'P2018':
        // Required connected records not found
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Required connected records not found',
          error: 'Not Found',
        };

      case 'P2019':
        // Input error
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid input data',
          error: 'Bad Request',
        };

      case 'P2020':
        // Value out of range for type
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Value is out of range for the field type',
          error: 'Bad Request',
        };

      case 'P2021':
        // Table does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database table not found',
          error: 'Internal Server Error',
        };

      case 'P2022':
        // Column does not exist
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database column not found',
          error: 'Internal Server Error',
        };

      case 'P2023':
        // Inconsistent column data
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid data format',
          error: 'Bad Request',
        };

      case 'P2024':
        // Connection timeout
        return {
          status: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Database connection timeout',
          error: 'Service Unavailable',
        };

      case 'P2026':
        // Unsupported provider feature
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database feature not supported',
          error: 'Internal Server Error',
        };

      case 'P2027':
        // Multiple errors
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Multiple validation errors occurred',
          error: 'Bad Request',
          details: {
            errors: (meta as any)?.errors,
          },
        };

      default:
        // Check if it's an RLS/permission error
        const errorMessage = error.message?.toLowerCase() || '';
        if (
          errorMessage.includes('row-level security') ||
          errorMessage.includes('permission denied') ||
          errorMessage.includes('policy violation') ||
          code === 'P2000' // Value too long (sometimes used for RLS)
        ) {
          return {
            status: HttpStatus.FORBIDDEN,
            message: 'You do not have permission to perform this action',
            error: 'Forbidden',
            details: {
              originalMessage: error.message,
            },
          };
        }
        
        // Unknown Prisma error
        this.logger.error(`Unhandled Prisma error code: ${code}`, error);
        return {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'A database error occurred',
          error: 'Internal Server Error',
        };
    }
  }

  private getUniqueConstraintMessage(meta: any): string {
    const target = meta?.target;
    if (Array.isArray(target) && target.length > 0) {
      const fields = target.join(', ');
      return `A record with this ${fields} already exists`;
    }
    return 'A record with these values already exists';
  }
}

