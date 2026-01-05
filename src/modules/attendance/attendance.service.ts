import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OpenAttendanceWindowDto } from './dto/open-attendance-window.dto';
import { TakeAttendanceDto } from './dto/take-attendance.dto';
import { MarkMemberAttendanceDto, BulkMarkAttendanceDto } from './dto/mark-member-attendance.dto';
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
    // Only admin and super_admin can create attendance windows
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Only administrators can create attendance windows');
    }

    // Validate that closesAt is after opensAt
    const opensAt = new Date(dto.opensAt);
    const closesAt = new Date(dto.closesAt);

    if (closesAt <= opensAt) {
      throw new BadRequestException('closesAt must be after opensAt');
    }

    return this.prisma.withRLSContext(user, async (tx) => {
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
    const windows = await this.prisma.attendanceWindow.findMany({
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

    // Calculate isOpen based on current time
    const now = new Date();
    return windows.map((window) => ({
      ...window,
      isOpen: now >= window.opensAt && now <= window.closesAt,
    }));
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

    // Calculate isOpen based on current time
    const now = new Date();
    return {
      ...window,
      isOpen: now >= window.opensAt && now <= window.closesAt,
    };
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
    const window = await this.prisma.attendanceWindow.findFirst({
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

    if (!window) {
      return null;
    }

    // Add isOpen field (by definition, this window is open)
    return {
      ...window,
      isOpen: true,
    };
  }

  async closeWindow(id: string, user: AuthenticatedUser) {
    // Only admin and super_admin can close attendance windows
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Only administrators can close attendance windows');
    }

    const window = await this.prisma.attendanceWindow.findUnique({
      where: { id },
    });

    if (!window) {
      throw new NotFoundException(`Attendance window with ID ${id} not found`);
    }

    const now = new Date();
    return this.prisma.withRLSContext(user, async (tx) => {
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

  // ============================================
  // Individual Member Attendance Methods
  // ============================================

  async markMemberAttendance(dto: MarkMemberAttendanceDto, user: AuthenticatedUser) {
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

    // Verify member exists and belongs to the class
    const member = await this.prisma.member.findUnique({
      where: { id: dto.memberId },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${dto.memberId} not found`);
    }

    if (member.currentClassId !== dto.classId) {
      throw new BadRequestException('Member does not belong to this class');
    }

    // Mark or update attendance
    const attendance = await this.prisma.memberAttendance.upsert({
      where: {
        memberId_attendanceWindowId: {
          memberId: dto.memberId,
          attendanceWindowId: dto.attendanceWindowId,
        },
      },
      create: {
        memberId: dto.memberId,
        classId: dto.classId,
        attendanceWindowId: dto.attendanceWindowId,
        status: dto.status,
        markedBy: user.id,
        notes: dto.notes,
      },
      update: {
        status: dto.status,
        markedBy: user.id,
        markedAt: new Date(),
        notes: dto.notes,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return attendance;
  }

  async bulkMarkAttendance(dto: BulkMarkAttendanceDto, user: AuthenticatedUser) {
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

    // Mark attendance for all members
    const results = await Promise.all(
      dto.attendance.map((record) =>
        this.markMemberAttendance(
          {
            memberId: record.memberId,
            classId: dto.classId,
            attendanceWindowId: dto.attendanceWindowId,
            status: record.status,
            notes: record.notes,
          },
          user
        )
      )
    );

    return {
      success: true,
      marked: results.length,
      records: results,
    };
  }

  async getClassMembersAttendance(classId: string, windowId: string) {
    // Get all members in the class
    const members = await this.prisma.member.findMany({
      where: { currentClassId: classId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        birthday: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    });

    // Get attendance records for this window
    const attendanceRecords = await this.prisma.memberAttendance.findMany({
      where: {
        classId,
        attendanceWindowId: windowId,
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Map attendance to members
    const attendanceMap = new Map(
      attendanceRecords.map((record) => [record.memberId, record])
    );

    return members.map((member) => ({
      ...member,
      attendance: attendanceMap.get(member.id) || null,
    }));
  }

  async getMemberAttendanceHistory(memberId: string, filters?: any): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters || {});

    const where: any = {
      memberId,
    };

    // Date range filter (on markedAt)
    const dateFilter = buildDateRangeFilter(filters?.dateFrom, filters?.dateTo, 'markedAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    const total = await this.prisma.memberAttendance.count({ where });

    const orderBy = buildSortOrder(filters?.sortBy, filters?.sortOrder, 'markedAt', 'desc');

    const data = await this.prisma.memberAttendance.findMany({
      skip,
      take,
      where,
      include: {
        class: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        attendanceWindow: {
          select: {
            id: true,
            sundayDate: true,
          },
        },
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
}

