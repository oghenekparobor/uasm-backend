import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Scope,
  Inject,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../common/types/auth-user.type';

export interface JwtClaims {
  sub: string;
  role: string;
  worker_id?: string | null;
  platoon_ids?: string[];
}

@Injectable({ scope: Scope.REQUEST })
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(REQUEST) private readonly httpRequest: Request) {
    super();
  }

  async onModuleInit() {
    await this.$connect();
    
    // NOTE: We do NOT use middleware here because Prisma's connection pooling
    // means the context-setting query and the actual query might use different connections.
    // Instead, we rely on:
    // 1. Transactions with explicit context setting via withRLSContext() for write operations
    // 2. setRequestContext() called by JwtAuthGuard for read operations (though this may not be reliable)
    // 
    // The ONLY reliable way to ensure RLS works is to use transactions for ALL operations
    // that need RLS enforcement.
  }
  
  private getRLSClaims(): JwtClaims | null {
    // Try to get RLS claims from user_rls first (set by JwtAuthGuard), fallback to user
    const rlsClaims = (this.httpRequest as any).user_rls as JwtClaims | undefined;
    const user = (this.httpRequest as any).user as AuthenticatedUser | undefined;

    if (!rlsClaims && !user) {
      return null;
    }

    // Use RLS claims if available, otherwise construct from AuthenticatedUser
    return rlsClaims || {
      sub: user!.id,
      role: user!.role,
      worker_id: user!.workerId ?? null,
      platoon_ids: user!.platoonIds ?? [],
    };
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Public method for explicit context setting (called by JwtAuthGuard)
   * This ensures context is set even before middleware runs
   */
  async setRequestContext(): Promise<void> {
    const claims = this.getRLSClaims();
    if (claims) {
      await this.$executeRawUnsafe(
        `SELECT set_config('request.jwt.claims', $1, true)`,
        JSON.stringify(claims),
      );
    } else {
      await this.$executeRawUnsafe(
        `SELECT set_config('request.jwt.claims', '{}', true)`,
      );
    }
  }

  /**
   * Helper method to execute a function within a transaction with RLS context set
   * This ensures RLS context is set on the same connection that executes the query
   * 
   * CRITICAL: This is the ONLY reliable way to ensure RLS works with Prisma's connection pooling.
   * All write operations that need RLS enforcement MUST use this method.
   */
  async withRLSContext<T>(fn: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>): Promise<T> {
    const claims = this.getRLSClaims();
    
    return this.$transaction(async (tx) => {
      // Set RLS context at the START of the transaction on the same connection
      // This ensures all subsequent queries in the transaction have the correct context
      if (claims) {
        // Use $executeRawUnsafe to set context - this executes on the transaction's connection
        await tx.$executeRawUnsafe(
          `SELECT set_config('request.jwt.claims', $1, true)`,
          JSON.stringify(claims),
        );
        this.logger.debug(`RLS context set in transaction for role: ${claims.role}`);
      } else {
        await tx.$executeRawUnsafe(
          `SELECT set_config('request.jwt.claims', '{}', true)`,
        );
      }
      
      // Execute the function with RLS context set
      // All queries in fn() will use the same connection and have the RLS context
      return fn(tx);
    });
  }

}

