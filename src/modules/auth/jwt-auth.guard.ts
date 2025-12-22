import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthenticatedUser, AppRole } from '@/common/types/auth-user.type';

interface JwtPayload {
  sub: string;
  role: AppRole;
  worker_id?: string | null;
  platoon_ids?: string[];
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Missing authentication token');
    }

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const user: AuthenticatedUser = {
      id: payload.sub,
      role: payload.role,
      workerId: payload.worker_id ?? null,
      platoonIds: payload.platoon_ids ?? [],
    };

    // Attach to request for controllers/services
    (request as any).user = user;

    // Also set the format needed for RLS context
    (request as any).user_rls = {
      sub: user.id,
      role: user.role,
      worker_id: user.workerId,
      platoon_ids: user.platoonIds,
    };

    // Ensure Postgres RLS sees these claims for all subsequent Prisma queries
    await this.prisma.setRequestContext();

    return true;
  }

  private extractTokenFromHeader(request: Request): string | null {
    const authHeader = request.headers['authorization'];
    if (!authHeader) return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return null;
    }

    return token;
  }
}


