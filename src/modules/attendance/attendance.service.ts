import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAttendanceWindowDto } from './dto/open-attendance-window.dto';
import { TakeAttendanceDto } from './dto/take-attendance.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import {
  buildDateRangeFilter,
  buildSortOrder,
} from '../../common/dto/filter.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async openWindow(dto: OpenAttendanceWindowDto, user: AuthenticatedUser) {
    // Validate that closesAt is after opensAt
    const opensAt = new Date(dto.opensAt);
    const closesAt = new Date(dto.closesAt);

    if (closesAt <= opensAt) {
      throw new BadRequestException('closesAt must be after opensAt');
    }

    // RLS ensures only admin/super_admin can create windows
    return this.prisma.withRLSContext(async (tx) => {
      return tx.attendanceWindow.create({
        data: {
          sundayDate: new Date(dto.sundayDate),
          opensAt,
          closesAt,
          createdBy: user.id,
        },
      });
    });
  }

  async findAllWindows() {
    // RLS filters based on role
    return this.prisma.attendanceWindow.findMany({
      orderBy: {
        sundayDate: 'desc',
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findOneWindow(id: string) {
    const window = await this.prisma.attendanceWindow.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classAttendance: {
          include: {
            class: true,
            user: {
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

    if (!window) {
      throw new NotFoundException(`Attendance window with ID ${id} not found`);
    }

    return window;
  }

  async takeAttendance(dto: TakeAttendanceDto, user: AuthenticatedUser) {
    // Verify window exists and is currently open
    const window = await this.prisma.attendanceWindow.findUnique({
      where: { id: dto.attendanceWindowId },
    });

    if (!window) {
      throw new NotFoundException(`Attendance window with ID ${dto.attendanceWindowId} not found`);
    }

    const now = new Date();
    if (now < window.opensAt || now > window.closesAt) {
      throw new BadRequestException('Attendance window is not currently open');
    }

    // RLS ensures user can only take attendance for their assigned classes
    const attendance = await this.prisma.withRLSContext(async (tx) => {
      return tx.classAttendance.upsert({
        where: {
          classId_attendanceWindowId: {
            classId: dto.classId,
            attendanceWindowId: dto.attendanceWindowId,
          },
        },
        create: {
          classId: dto.classId,
          attendanceWindowId: dto.attendanceWindowId,
          count: dto.count,
          takenBy: user.id,
        },
        update: {
          count: dto.count,
          takenBy: user.id,
          takenAt: new Date(),
        },
      });
    });

    // Log attendance submission (outside transaction)
    try {
      await this.activityLogs.logAttendanceSubmission(
        dto.classId,
        dto.attendanceWindowId,
        dto.count,
      );
    } catch (error) {
      console.error('Failed to log attendance submission:', error);
    }

    return attendance;
  }

  async findAllAttendance(classId?: string, windowId?: string, filters?: any): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters || {});

    // Build where clause
    const where: any = {};

    if (classId) {
      where.classId = classId;
    }

    if (windowId) {
      where.attendanceWindowId = windowId;
    }

    // Date range filter (on takenAt)
    const dateFilter = buildDateRangeFilter(filters?.dateFrom, filters?.dateTo, 'takenAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    // Get total count for pagination metadata
    const total = await this.prisma.classAttendance.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters?.sortBy, filters?.sortOrder, 'takenAt', 'desc');

    // RLS filters based on role and platoon assignments
    const data = await this.prisma.classAttendance.findMany({
      skip,
      take,
      where,
      include: {
        class: true,
        attendanceWindow: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
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

  async findCurrentWindow() {
    const now = new Date();
    // RLS filters based on role
    return this.prisma.attendanceWindow.findFirst({
      where: {
        opensAt: { lte: now },
        closesAt: { gte: now },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classAttendance: {
          include: {
            class: true,
          },
        },
      },
      orderBy: {
        sundayDate: 'desc',
      },
    });
  }

  async closeWindow(id: string) {
    const window = await this.prisma.attendanceWindow.findUnique({
      where: { id },
    });

    if (!window) {
      throw new NotFoundException(`Attendance window with ID ${id} not found`);
    }

    const now = new Date();
    // RLS ensures only admin/super_admin can update windows
    return this.prisma.withRLSContext(async (tx) => {
      return tx.attendanceWindow.update({
        where: { id },
        data: {
          closesAt: now < window.closesAt ? now : window.closesAt,
        },
      });
    });
  }

  async getSummary(windowId?: string) {
    // RLS ensures only distribution/admin can see summary
    const window = windowId
      ? await this.prisma.attendanceWindow.findUnique({
          where: { id: windowId },
        })
      : await this.findCurrentWindow();

    if (!window) {
      throw new NotFoundException('No attendance window found');
    }

    const windowIdToUse = windowId || (window as any).id;

    const attendance = await this.prisma.classAttendance.findMany({
      where: {
        attendanceWindowId: windowIdToUse,
      },
      include: {
        class: true,
      },
    });

    const total = attendance.reduce((sum, a) => sum + a.count, 0);

    return {
      window: windowId ? window : (window as any),
      summary: {
        totalClasses: attendance.length,
        totalAttendance: total,
        byClass: attendance.map((a) => ({
          classId: a.class.id,
          className: a.class.name,
          count: a.count,
        })),
      },
    };
  }
}

