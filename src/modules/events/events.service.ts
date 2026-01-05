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
    // Only admin and super_admin can create events
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new BadRequestException('Only administrators can create events');
    }

    // Validate class-scoped events
    if (dto.scope === 'CLASS' && !dto.classId) {
      throw new BadRequestException('classId is required for CLASS scope events');
    }

    if (dto.scope === 'GLOBAL' && dto.classId) {
      throw new BadRequestException('classId should not be provided for GLOBAL events');
    }

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
          eventDate: new Date(dto.eventDate),
          isRecurring: dto.isRecurring || false,
          requiresApproval: false, // Admin-created events don't need approval
          status: EventStatus.APPROVED, // Admin-created events are auto-approved
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

  async findAll(pagination?: PaginationDto, user?: AuthenticatedUser): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Build where clause based on user role
    const where: any = {
      status: EventStatus.APPROVED, // Only show approved events
    };

    // Non-admin users see: GLOBAL events + CLASS events for their assigned classes
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      // Get user's class assignments
      const classLeaders = await this.prisma.classLeader.findMany({
        where: {
          userId: user.id,
        },
        select: {
          classId: true,
        },
      });

      const userClassIds = classLeaders.map((cl) => cl.classId);

      // Show GLOBAL events OR events for classes the user is assigned to
      where.OR = [
        { scope: 'GLOBAL' },
        ...(userClassIds.length > 0 ? [{ scope: 'CLASS', classId: { in: userClassIds } }] : []),
      ];
    }

    // Get total count for pagination metadata
    const total = await this.prisma.event.count({ where });

    // RLS filters: users see their relevant events, admin sees all
    const data = await this.prisma.event.findMany({
      where,
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
        eventDate: 'asc', // Order by event date
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getEventsForReminders(daysAhead: number = 1): Promise<any[]> {
    // Get events that need reminders (within the next N days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    const events = await this.prisma.event.findMany({
      where: {
        status: EventStatus.APPROVED,
        eventDate: {
          gte: today,
          lte: futureDate,
        },
      },
      include: {
        class: {
          include: {
            classLeaders: {
              include: {
                user: {
                  select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        eventDate: 'asc',
      },
    });

    return events;
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

