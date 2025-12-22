import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignLeaderDto } from './dto/assign-leader.dto';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';

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

  async findAll(pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.class.count();

    // RLS filters: admin sees all, leaders see only assigned
    const data = await this.prisma.class.findMany({
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
      orderBy: {
        name: 'asc',
      },
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
}

