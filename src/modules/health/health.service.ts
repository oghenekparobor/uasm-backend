import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      responseTime?: number;
      error?: string;
    };
    cloudinary?: {
      status: 'up' | 'down' | 'not_configured';
      error?: string;
    };
  };
  uptime: number;
  version?: string;
}

@Injectable()
export class HealthService {
  private readonly startTime: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.startTime = Date.now();
  }

  async check(): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {
      database: await this.checkDatabase(),
    };

    // Check Cloudinary if configured
    const cloudinaryCheck = await this.checkCloudinary();
    if (cloudinaryCheck) {
      checks.cloudinary = cloudinaryCheck;
    }

    const allChecksHealthy = Object.values(checks).every(
      (check) => check.status === 'up' || check.status === 'not_configured',
    );

    return {
      status: allChecksHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      checks,
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // seconds
      version: this.configService.get<string>('APP_VERSION', '1.0.0'),
    };
  }

  private async checkDatabase(): Promise<{
    status: 'up' | 'down';
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'up',
        responseTime,
      };
    } catch (error: any) {
      return {
        status: 'down',
        error: error.message || 'Database connection failed',
      };
    }
  }

  private async checkCloudinary(): Promise<{
    status: 'up' | 'down' | 'not_configured';
    error?: string;
  } | null> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    // If Cloudinary is not configured, return not_configured
    if (!cloudName || !apiKey || !apiSecret) {
      return {
        status: 'not_configured',
      };
    }

    // Cloudinary doesn't have a simple ping endpoint
    // We'll just check if credentials are present
    // In production, you might want to do an actual API call
    return {
      status: 'up',
    };
  }
}

