import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedUser } from '../common/types/auth-user.type';

export interface JwtClaims {
  sub: string;
  role: string;
  worker_id?: string | null;
  platoon_ids?: string[];
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: ['warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Database connection established');
    
    // NOTE: We do NOT use middleware here because Prisma's connection pooling
    // means the context-setting query and the actual query might use different connections.
    // Instead, we rely on:
    // 1. Transactions with explicit context setting via withRLSContext() for write operations
    // 2. setRequestContext() called by JwtAuthGuard for read operations (though this may not be reliable)
    // 
    // The ONLY reliable way to ensure RLS works is to use transactions for ALL operations
    // that need RLS enforcement.
  }
  
  private getRLSClaimsFromUser(user: AuthenticatedUser | JwtClaims | undefined): JwtClaims | null {
    if (!user) {
      return null;
    }

    // Check if it's already JwtClaims format
    if ('sub' in user) {
      return user as JwtClaims;
    }

    // Convert AuthenticatedUser to JwtClaims
    const authUser = user as AuthenticatedUser;
    return {
      sub: authUser.id,
      role: authUser.role,
      worker_id: authUser.workerId ?? null,
      platoon_ids: authUser.platoonIds ?? [],
    };
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }

  /**
   * Public method for explicit context setting (called by JwtAuthGuard)
   * This ensures context is set even before middleware runs
   * @deprecated This method is not reliable with connection pooling. Use withRLSContext instead.
   */
  async setRequestContext(user?: AuthenticatedUser | JwtClaims): Promise<void> {
    const claims = this.getRLSClaimsFromUser(user);
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
   * 
   * @param userOrFn - The authenticated user/JWT claims, OR the function to execute (for backward compat)
   * @param fn - The function to execute within the transaction (optional if first param is function)
   */
  async withRLSContext<T>(
    userOrFn: AuthenticatedUser | JwtClaims | undefined | ((tx: any) => Promise<T>),
    fn?: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>
  ): Promise<T> {
    // Handle backward compatibility: if first param is a function, use it as the fn with no user context
    let user: AuthenticatedUser | JwtClaims | undefined;
    let actualFn: (tx: any) => Promise<T>;
    
    if (typeof userOrFn === 'function') {
      user = undefined;
      actualFn = userOrFn;
      this.logger.warn('withRLSContext called without user context. This may bypass RLS policies.');
    } else {
      user = userOrFn;
      actualFn = fn!;
    }
    
    const claims = this.getRLSClaimsFromUser(user);
    
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
      return actualFn(tx);
    });
  }

}


