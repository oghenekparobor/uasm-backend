import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Express } from 'express';

export interface UploadResult {
  url: string;
  publicId: string;
  secureUrl: string;
  format: string;
  width?: number;
  height?: number;
  bytes: number;
}

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadResult> {
    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        resource_type: 'auto', // auto-detect image, video, raw
        folder: folder || 'uams',
      };

      cloudinary.uploader
        .upload_stream(uploadOptions, (error, result) => {
          if (error) {
            reject(new BadRequestException(`Upload failed: ${error.message}`));
            return;
          }

          if (!result) {
            reject(new BadRequestException('Upload failed: No result returned'));
            return;
          }

          resolve({
            url: result.url,
            publicId: result.public_id,
            secureUrl: result.secure_url,
            format: result.format || 'unknown',
            width: result.width,
            height: result.height,
            bytes: result.bytes,
          });
        })
        .end(file.buffer);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(new BadRequestException(`Delete failed: ${error.message}`));
          return;
        }
        resolve();
      });
    });
  }

  getFileUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    format?: string;
    quality?: string;
  }): string {
    const transformations: string[] = [];
    
    if (options?.width) transformations.push(`w_${options.width}`);
    if (options?.height) transformations.push(`h_${options.height}`);
    if (options?.format) transformations.push(`f_${options.format}`);
    if (options?.quality) transformations.push(`q_${options.quality}`);

    const transformString = transformations.length > 0 
      ? transformations.join(',') + '/'
      : '';

    return cloudinary.url(`${transformString}${publicId}`);
  }
}

