import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignLeaderDto } from './dto/assign-leader.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import { ClassFilterDto } from './dto/class-filter.dto';

// Synthetic Workers class ID used by distribution (excluded from classes list)
const WORKERS_CLASS_ID = '00000000-0000-0000-0000-00000000WORK';

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateClassDto) {
    // RLS ensures only admin/super_admin can create classes
    return this.prisma.withRLSContext(async (tx) => {
      return tx.class.create({
        data: {
          name: dto.name,
          type: dto.type,
        },
        include: {
          classLeaders: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async findAll(query?: ClassFilterDto, user?: AuthenticatedUser): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(query || {});

    // Build where clause based on user role
    const where: any = {
      id: { not: WORKERS_CLASS_ID }, // Exclude synthetic Workers class
    };

    // If user is not admin/super_admin, filter to only show classes they're assigned to
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      where.classLeaders = {
        some: {
          userId: user.id,
        },
      };
    }

    // Search by class name (case-insensitive)
    if (query?.search?.trim()) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    // Sort: allow name, type; default name asc
    const allowedSortFields = ['name', 'type'];
    const sortBy = query?.sortBy && allowedSortFields.includes(query.sortBy) ? query.sortBy : 'name';
    const sortOrder = query?.sortOrder === 'desc' ? 'desc' : 'asc';
    const orderBy = { [sortBy]: sortOrder };

    // Get total count for pagination metadata
    const total = await this.prisma.class.count({ where });

    // Fetch classes with filtering
    const data = await this.prisma.class.findMany({
      where,
      skip,
      take,
      include: {
        classLeaders: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy,
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const classEntity = await this.prisma.class.findUnique({
      where: { id },
      include: {
        classLeaders: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            birthday: true,
          },
          orderBy: {
            lastName: 'asc',
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    });

    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${id} not found`);
    }

    return classEntity;
  }

  async update(id: string, dto: UpdateClassDto) {
    // RLS ensures only admin/super_admin can update classes
    return this.prisma.withRLSContext(async (tx) => {
      // Verify class exists (within transaction with RLS context)
      const classEntity = await tx.class.findUnique({
        where: { id },
      });

      if (!classEntity) {
        throw new NotFoundException(`Class with ID ${id} not found`);
      }

      return tx.class.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
        },
        include: {
          classLeaders: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });
  }

  async assignLeader(classId: string, dto: AssignLeaderDto) {
    // RLS ensures only admin/super_admin can assign leaders
    return this.prisma.withRLSContext(async (tx) => {
      // Verify class exists (within transaction with RLS context)
      const classEntity = await tx.class.findUnique({
        where: { id: classId },
      });

      if (!classEntity) {
        throw new NotFoundException(`Class with ID ${classId} not found`);
      }

      // Verify user exists (within transaction with RLS context)
      const user = await tx.user.findUnique({
        where: { id: dto.userId },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${dto.userId} not found`);
      }

      // Check if already assigned (within transaction with RLS context)
      const existing = await tx.classLeader.findUnique({
        where: {
          classId_userId_role: {
            classId,
            userId: dto.userId,
            role: dto.role,
          },
        },
      });

      if (existing) {
        throw new ConflictException(
          `User is already assigned as ${dto.role} to this class`,
        );
      }

      return tx.classLeader.create({
        data: {
          classId,
          userId: dto.userId,
          role: dto.role,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          class: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });
    });
  }

  async removeLeader(classId: string, userId: string, role: string) {
    // RLS ensures only admin/super_admin can remove leaders
    return this.prisma.withRLSContext(async (tx) => {
      await tx.classLeader.delete({
        where: {
          classId_userId_role: {
            classId,
            userId,
            role: role as any,
          },
        },
      });

      return { message: 'Leader removed successfully' };
    });
  }

  async delete(classId: string, user: AuthenticatedUser) {
    if (user.role !== 'super_admin') {
      throw new ForbiddenException('Only super admins can remove classes.');
    }

    const classEntity = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, name: true, _count: { select: { members: true } } },
    });
    if (!classEntity) {
      throw new NotFoundException(`Class with ID ${classId} not found`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Unlink events that reference this class
      await tx.event.updateMany({
        where: { classId },
        data: { classId: null },
      });
      // Remove member-class history involving this class
      await tx.memberClassHistory.deleteMany({
        where: { OR: [{ toClassId: classId }, { fromClassId: classId }] },
      });
      // Delete all members in this class (cascades their logs, requests, attendance, etc.)
      await tx.member.deleteMany({
        where: { currentClassId: classId },
      });
      // Delete the class (cascades classLeaders, classAttendance, memberAttendance, classDistributions, classOfferings)
      await tx.class.delete({
        where: { id: classId },
      });
    });

    return { message: 'Class and all its members removed successfully' };
  }
}

