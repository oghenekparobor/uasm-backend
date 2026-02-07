import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Inject, Scope } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AssignRoleDto } from './dto/assign-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import {
  buildTextSearchFilter,
  buildDateRangeFilter,
  buildSortOrder,
  parseSearchFields,
} from '../../common/dto/filter.dto';
import * as bcrypt from 'bcrypt';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async create(dto: CreateUserDto) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // RLS ensures only admin/super_admin can create users
    // Use transaction to ensure RLS context is set on the same connection
    return this.prisma.withRLSContext(async (tx) => {
      return tx.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          phone: dto.phone,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      });
    });
  }

  async findAll(filters: UserFilterDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters);

    // Build where clause
    const where: any = {};

    // Text search
    const searchFields = parseSearchFields(filters.searchFields || 'firstName,lastName,email');
    const searchFilter = buildTextSearchFilter(filters.search, searchFields.length > 0 ? searchFields : ['firstName', 'lastName', 'email']);
    if (searchFilter) {
      Object.assign(where, searchFilter);
    }

    // Specific field filters
    if (filters.email) {
      where.email = {
        contains: filters.email,
        mode: 'insensitive',
      };
    }

    if (filters.firstName) {
      where.firstName = {
        contains: filters.firstName,
        mode: 'insensitive',
      };
    }

    if (filters.lastName) {
      where.lastName = {
        contains: filters.lastName,
        mode: 'insensitive',
      };
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Role filter
    if (filters.roles && filters.roles.length > 0) {
      where.userRoles = {
        some: {
          role: {
            name: {
              in: filters.roles,
            },
          },
        },
      };
    }

    // Date range filter
    const dateFilter = buildDateRangeFilter(filters.dateFrom, filters.dateTo, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    // Get total count for pagination metadata
    const total = await this.prisma.user.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters.sortBy, filters.sortOrder, 'lastName', 'asc');

    // RLS filters based on role
    const users = await this.prisma.user.findMany({
      skip,
      take,
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy,
    });

    // Transform userRoles to roles format expected by frontend
    const data = users.map((user) => {
      const { userRoles, ...userData } = user;
      return {
        ...userData,
        roles: userRoles.map((ur) => ({
          id: ur.roleId,
          role: ur.role.name,
        })),
      };
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
        classLeaders: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Transform userRoles to roles format expected by frontend
    const { userRoles, ...userData } = user;
    return {
      ...userData,
      roles: userRoles.map((ur) => ({
        id: ur.roleId,
        role: ur.role.name,
      })),
    };
  }

  async update(id: string, dto: UpdateUserDto) {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // RLS ensures only admin/super_admin can update users
    // Use transaction to ensure RLS context is set on the same connection
    return this.prisma.withRLSContext(async (tx) => {
      return tx.user.update({
        where: { id },
        data: {
          ...(dto.email && { email: dto.email }),
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          updatedAt: true,
        },
      });
    });
  }

  async assignRole(dto: AssignRoleDto, user: AuthenticatedUser) {
    // RLS ensures only admin/super_admin can assign roles
    // Use transaction to ensure RLS context is set on the same connection
    // Do ALL validation and the create within the same transaction
    return this.prisma.withRLSContext(async (tx) => {
      // Verify user exists (within transaction with RLS context)
      const targetUser = await tx.user.findUnique({
        where: { id: dto.userId },
      });

      if (!targetUser) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      // Verify role exists (within transaction with RLS context)
      const role = await tx.role.findUnique({
        where: { id: dto.roleId },
      });

      if (!role) {
        throw new NotFoundException(`Role with ID ${dto.roleId} not found`);
      }

      // Check if role is already assigned (within transaction with RLS context)
      const existing = await tx.userRole.findUnique({
        where: {
          userId_roleId: {
            userId: dto.userId,
            roleId: dto.roleId,
          },
        },
      });

      if (existing) {
        throw new ConflictException(`Role ${role.name} is already assigned to this user`);
      }

      // Create user role (RLS will block if not admin/super_admin)
      const userRole = await tx.userRole.create({
        data: {
          userId: dto.userId,
          roleId: dto.roleId,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          role: true,
        },
      });

      // Log role assignment (outside transaction to avoid nested transaction issues)
      // Note: This will be called after transaction commits
      setImmediate(async () => {
        try {
          await this.activityLogs.logRoleChange(dto.userId, dto.roleId, 'ASSIGNED');
        } catch (error) {
          // Don't fail the operation if logging fails
          console.error('Failed to log role assignment:', error);
        }
      });

      return userRole;
    });
  }

  async removeRole(userId: string, roleId: number, user: AuthenticatedUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can remove roles from users.');
    }
    // Use transaction to ensure RLS context is set on the same connection
    return this.prisma.withRLSContext(async (tx) => {
      // Verify user role exists (within transaction with RLS context)
      const userRole = await tx.userRole.findUnique({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
        include: {
          role: true,
        },
      });

      if (!userRole) {
        throw new NotFoundException('User role assignment not found');
      }

      // Delete user role (RLS will block if not admin/super_admin)
      await tx.userRole.delete({
        where: {
          userId_roleId: {
            userId,
            roleId,
          },
        },
      });

      // Log role removal (outside transaction to avoid nested transaction issues)
      setImmediate(async () => {
        try {
          await this.activityLogs.logRoleChange(userId, roleId, 'REMOVED');
        } catch (error) {
          // Don't fail the operation if logging fails
          console.error('Failed to log role removal:', error);
        }
      });

      return { message: 'Role removed successfully' };
    });
  }

  async getUserRoles(userId: string) {
    // RLS filters based on role
    return this.prisma.userRole.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });
  }

  async getAllRoles() {
    return this.prisma.role.findMany({
      orderBy: { id: 'asc' },
      select: { id: true, name: true },
    });
  }

  async delete(userId: string, currentUser: AuthenticatedUser) {
    if (currentUser.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can delete users.');
    }
    if (currentUser.id === userId) {
      throw new BadRequestException('You cannot delete your own account.');
    }

    const target = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!target) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.activityLog.deleteMany({
          where: { actorId: userId },
        });
        await tx.user.delete({
          where: { id: userId },
        });
      });
      return { message: 'User deleted successfully' };
    } catch (error: any) {
      if (error?.code === 'P2003' || error?.message?.includes('foreign key')) {
        throw new BadRequestException(
          'Cannot delete user: they have associated records (e.g. requests, attendance, distribution). Deactivate the user instead.',
        );
      }
      throw error;
    }
  }
}

