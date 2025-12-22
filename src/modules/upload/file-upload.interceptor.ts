import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';

export interface FileUploadOptions {
  fieldName?: string;
  maxSize?: number; // in bytes
  allowedMimeTypes?: string[];
  required?: boolean;
}

export function FileUploadInterceptor(options: FileUploadOptions = {}) {
  const {
    fieldName = 'file',
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
    ],
    required = true,
  } = options;

  const multerOptions: MulterOptions = {
    storage: memoryStorage(), // Use memory storage (file.buffer will be available)
    limits: {
      fileSize: maxSize,
    },
    fileFilter: (req, file, cb) => {
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new Error(
            `File type ${file.mimetype} not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
          ) as any,
          false,
        );
      }
    },
  };

  const BaseInterceptor = FileInterceptor(fieldName, multerOptions);

  @Injectable()
  class Interceptor extends BaseInterceptor implements NestInterceptor {
    async intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Promise<Observable<any>> {
      await super.intercept(context, next);

      const request = context.switchToHttp().getRequest();
      const file = request.file;

      if (required && !file) {
        throw new BadRequestException(`File is required`);
      }

      if (file) {
        // Validate file size (multer should handle this, but double-check)
        if (file.size > maxSize) {
          throw new BadRequestException(
            `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024}MB`,
          );
        }

        // Validate MIME type (multer should handle this, but double-check)
        if (!allowedMimeTypes.includes(file.mimetype)) {
          throw new BadRequestException(
            `File type not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
          );
        }
      }

      return next.handle();
    }
  }

  return Interceptor;
}

