import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { EmailService } from '../email/email.service';

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    workerId?: string | null;
    platoonIds: string[];
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Get user roles and platoon assignments
    const roles = user.userRoles.map((ur) => ur.role.name);
    const primaryRole = roles.includes('super_admin')
      ? 'super_admin'
      : roles.includes('admin')
        ? 'admin'
        : roles[0] || 'worker';

    // Get platoon assignments for leaders/teachers
    const classLeaders = await this.prisma.classLeader.findMany({
      where: {
        userId: user.id,
        role: {
          in: ['LEADER', 'ASSISTANT', 'TEACHER'],
        },
      },
      select: {
        classId: true,
      },
    });

    const platoonIds = classLeaders.map((cl) => cl.classId);

    // Generate tokens
    const payload = {
      sub: user.id,
      role: primaryRole,
      worker_id: user.id,
      platoon_ids: platoonIds,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>(
        'JWT_REFRESH_EXPIRES_IN',
        '7d',
      ),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: primaryRole,
        workerId: user.id,
        platoonIds,
      },
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      // Verify user still exists and is active
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User no longer active');
      }

      // Regenerate access token with current roles
      const roles = user.userRoles.map((ur) => ur.role.name);
      const primaryRole = roles.includes('super_admin')
        ? 'super_admin'
        : roles.includes('admin')
          ? 'admin'
          : roles[0] || 'worker';

      const classLeaders = await this.prisma.classLeader.findMany({
        where: {
          userId: user.id,
          role: {
            in: ['LEADER', 'ASSISTANT', 'TEACHER'],
          },
        },
        select: {
          classId: true,
        },
      });

      const platoonIds = classLeaders.map((cl) => cl.classId);

      const newPayload = {
        sub: user.id,
        role: primaryRole,
        worker_id: user.id,
        platoon_ids: platoonIds,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '24h'),
      });

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getCurrentUser(user: AuthenticatedUser) {
    // RLS will filter based on user's role
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('User not found');
    }

    const roles = dbUser.userRoles.map((ur) => ur.role.name);
    const classLeaders = await this.prisma.classLeader.findMany({
      where: {
        userId: user.id,
        role: {
          in: ['LEADER', 'ASSISTANT', 'TEACHER'],
        },
      },
      include: {
        class: true,
      },
    });

    return {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      phone: dbUser.phone,
      roles,
      platoons: classLeaders.map((cl) => ({
        id: cl.class.id,
        name: cl.class.name,
        type: cl.class.type,
        role: cl.role,
      })),
    };
  }

  async logout(user: AuthenticatedUser): Promise<{ message: string }> {
    // With stateless JWTs, logout is primarily handled client-side
    // The client should remove the tokens from storage
    // Optionally, we could implement a token blacklist here if needed
    
    // For now, just return success - client removes tokens
    return { message: 'Logged out successfully' };
  }

  async changePassword(
    user: AuthenticatedUser,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    // Get user from database
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      dto.currentPassword,
      dbUser.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different
    const isSamePassword = await bcrypt.compare(
      dto.newPassword,
      dbUser.passwordHash,
    );

    if (isSamePassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Send confirmation email
    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, firstName: true },
      });

      if (dbUser) {
        await this.emailService.sendPasswordChangedEmail(
          dbUser.email,
          dbUser.firstName,
        );
      }
    } catch (error) {
      console.error('Failed to send password changed email:', error);
      // Don't fail the request if email fails
    }

    return { message: 'Password changed successfully' };
  }

  async requestPasswordReset(dto: RequestPasswordResetDto): Promise<{ message: string }> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Don't reveal if user exists or not (security best practice)
    if (!user) {
      // Still return success to prevent email enumeration
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // Generate JWT token for password reset (more secure than storing in DB)
    const resetJwt = this.jwtService.sign(
      { sub: user.id, type: 'password_reset' },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: '1h',
      },
    );

    // Send password reset email
    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetJwt,
        user.firstName,
      );
    } catch (error) {
      // Log error but don't reveal if email exists
      console.error('Failed to send password reset email:', error);
      // In development, log the token as fallback
      if (process.env.NODE_ENV === 'development') {
        console.log(`Password reset token for ${user.email}: ${resetJwt}`);
      }
    }

    return {
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Verify reset token
    let payload: { sub: string; type: string };
    try {
      payload = this.jwtService.verify(dto.token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Verify token type
    if (payload.type !== 'password_reset') {
      throw new UnauthorizedException('Invalid reset token');
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(dto.newPassword, 10);

    // Update password
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    // Send confirmation email
    try {
      await this.emailService.sendPasswordChangedEmail(
        user.email,
        user.firstName,
      );
    } catch (error) {
      console.error('Failed to send password changed email:', error);
      // Don't fail the request if email fails
    }

    return { message: 'Password reset successfully' };
  }
}

