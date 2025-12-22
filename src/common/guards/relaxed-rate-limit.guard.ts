import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

/**
 * Custom rate limit guard that applies relaxed limits for GET requests (read operations)
 * and stricter limits for write operations (POST, PUT, PATCH, DELETE).
 * 
 * This allows for more frequent data fetching while still protecting write endpoints.
 * 
 * NOTE: Currently disabled in app.module.ts
 */
@Injectable()
export class RelaxedRateLimitGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use IP address for tracking (same as default)
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  protected generateKey(
    context: ExecutionContext,
    suffix: string,
    name: string,
  ): string {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();
    
    // Different rate limit keys for read vs write operations
    // This allows us to have separate counters for GET vs POST/PUT/PATCH/DELETE
    const operationType = ['GET', 'HEAD', 'OPTIONS'].includes(method)
      ? 'read'
      : 'write';
    
    // Include operation type in the key
    // Note: We can't use getTracker here since generateKey must be synchronous
    // So we'll extract the tracker inline
    const tracker = request.ip || request.connection?.remoteAddress || 'unknown';
    return `${tracker}:${operationType}:${suffix}`;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase();
    
    // Check if endpoint has custom throttle decorator (skip if it does)
    const handler = context.getHandler();
    const classRef = context.getClass();
    const customThrottle = this.reflector.getAllAndOverride<Record<string, { limit: number; ttl: number }>>(
      'THROTTLE',
      [handler, classRef],
    );

    // If custom throttle is set, use default behavior
    if (customThrottle) {
      return super.canActivate(context);
    }

    // Apply relaxed limits for read operations (GET, HEAD, OPTIONS)
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      // Find the relaxed throttler configuration
      const relaxedThrottler = (this.options as any).throttlers?.find(
        (t: any) => t.name === 'relaxed',
      );

      if (!relaxedThrottler) {
        // Fallback to default behavior if relaxed throttler not found
        return super.canActivate(context);
      }

      const tracker = await this.getTracker(request);
      const key = this.generateKey(context, '', 'relaxed');
      
      // Use the storage service to check/increment the counter
      const totalHits = await (this.storageService as any).increment(key, relaxedThrottler.ttl);
      
      if (totalHits > relaxedThrottler.limit) {
        throw new ThrottlerException();
      }

      return true;
    }

    // Use default/strict limits for write operations
    return super.canActivate(context);
  }
}
