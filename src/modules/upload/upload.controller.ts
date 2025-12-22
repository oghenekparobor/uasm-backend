import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('files')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 50, ttl: 60000 } }) // 50 requests per minute
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /**
   * Get file URL with optional transformations
   * This endpoint generates Cloudinary URLs with transformations
   */
  @Get(':publicId')
  @HttpCode(HttpStatus.OK)
  getFileUrl(
    @Param('publicId') publicId: string,
    @Query('width') width?: string,
    @Query('height') height?: string,
    @Query('format') format?: string,
    @Query('quality') quality?: string,
  ) {
    const url = this.uploadService.getFileUrl(publicId, {
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      format: format,
      quality: quality,
    });

    return {
      url,
      publicId,
      transformations: {
        width: width ? parseInt(width, 10) : undefined,
        height: height ? parseInt(height, 10) : undefined,
        format,
        quality,
      },
    };
  }
}

