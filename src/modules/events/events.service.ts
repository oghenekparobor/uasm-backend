import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { EventStatus } from '@prisma/client';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEventDto, user: AuthenticatedUser) {
    // Validate class-scoped events
    if (dto.scope === 'CLASS' && !dto.classId) {
      throw new BadRequestException('classId is required for CLASS scope events');
    }

    if (dto.scope === 'GLOBAL' && dto.classId) {
      throw new BadRequestException('classId should not be provided for GLOBAL events');
    }

    // RLS ensures leaders can only create events for their classes
    const requiresApproval = dto.scope === 'CLASS' && user.role !== 'admin' && user.role !== 'super_admin';

    return this.prisma.withRLSContext(async (tx) => {
      // Verify class exists if provided (within transaction with RLS context)
      if (dto.classId) {
        const classEntity = await tx.class.findUnique({
          where: { id: dto.classId },
        });

        if (!classEntity) {
          throw new NotFoundException(`Class with ID ${dto.classId} not found`);
        }
      }

      return tx.event.create({
        data: {
          title: dto.title,
          description: dto.description,
          scope: dto.scope,
          classId: dto.classId,
          isRecurring: dto.isRecurring || false,
          requiresApproval,
          status: requiresApproval ? EventStatus.PENDING : EventStatus.APPROVED,
          createdBy: user.id,
        },
        include: {
          class: dto.classId ? true : false,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  }

  async findAll(pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.event.count();

    // RLS filters: leaders see their class events, admin sees all
    const data = await this.prisma.event.findMany({
      skip,
      take,
      include: {
        class: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            eventAttendance: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        class: true,
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        eventAttendance: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }

    return event;
  }

  async approve(id: string) {
    // RLS ensures only admin/super_admin can approve
    return this.prisma.withRLSContext(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      if (event.status !== EventStatus.PENDING) {
        throw new BadRequestException('Only pending events can be approved');
      }

      return tx.event.update({
        where: { id },
        data: {
          status: EventStatus.APPROVED,
        },
        include: {
          class: true,
          creator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  }

  async recordAttendance(eventId: string, memberId: string, attended: boolean) {
    // RLS ensures only admin/leaders can record attendance
    return this.prisma.withRLSContext(async (tx) => {
      // Verify event exists (within transaction with RLS context)
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Verify member exists (within transaction with RLS context)
      const member = await tx.member.findUnique({
        where: { id: memberId },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${memberId} not found`);
      }

      // Check if attendance record already exists (within transaction with RLS context)
      const existing = await tx.eventAttendance.findFirst({
        where: {
          eventId,
          memberId,
        },
      });

      if (existing) {
        return tx.eventAttendance.update({
          where: { id: existing.id },
          data: { attended },
        });
      } else {
        return tx.eventAttendance.create({
          data: {
            eventId,
            memberId,
            attended,
          },
        });
      }
    });
  }
}

