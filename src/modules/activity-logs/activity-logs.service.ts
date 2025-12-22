import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import {
  buildDateRangeFilter,
  buildSortOrder,
} from '../../common/dto/filter.dto';

export interface ActivityLogData {
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an activity log entry
   * Note: This should be called AFTER the main operation succeeds
   * The actor_id is automatically set from request.jwt.claims (via RLS context)
   */
  async log(data: ActivityLogData): Promise<void> {
    // Get actor_id from current request context
    // Since we're using RLS, we can extract it from the JWT claims
    // Handle cases where the context might be empty or invalid JSON
    try {
      const result = await this.prisma.$queryRaw<Array<{ actor_id: string | null }>>`
        SELECT 
          CASE 
            WHEN current_setting('request.jwt.claims', true) IS NULL 
              OR current_setting('request.jwt.claims', true) = '' 
              OR current_setting('request.jwt.claims', true) = '{}'
            THEN NULL
            ELSE 
              CASE 
                WHEN (current_setting('request.jwt.claims', true)::json->>'sub') IS NULL
                THEN NULL
                ELSE (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
              END
          END as actor_id
      `;

      const actorId = result[0]?.actor_id;
      if (!actorId) {
        // If no actor_id, skip logging (might be system operation or RLS context not set)
        return;
      }

      await this.prisma.activityLog.create({
        data: {
          actorId,
          action: data.action,
          entityType: data.entityType,
          entityId: data.entityId,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      // If there's an error getting the actor_id (e.g., invalid JSON), skip logging
      // This prevents the entire operation from failing due to logging issues
      console.error('Failed to log activity:', error);
      return;
    }
  }

  /**
   * Log attendance submission
   */
  async logAttendanceSubmission(
    classId: string,
    attendanceWindowId: string,
    count: number,
  ): Promise<void> {
    await this.log({
      action: 'ATTENDANCE_SUBMITTED',
      entityType: 'class_attendance',
      metadata: {
        classId,
        attendanceWindowId,
        count,
      },
    });
  }

  /**
   * Log empowerment approval/rejection
   */
  async logEmpowermentApproval(
    empowermentId: string,
    memberId: string,
    status: string,
  ): Promise<void> {
    await this.log({
      action: `EMPOWERMENT_${status}`,
      entityType: 'empowerment_request',
      entityId: empowermentId,
      metadata: {
        memberId,
        status,
      },
    });
  }

  /**
   * Log distribution allocation
   */
  async logDistributionAllocation(
    allocationId: string,
    batchId: string,
    classId: string,
    foodAllocated: number,
    waterAllocated: number,
    allocationType: string,
  ): Promise<void> {
    await this.log({
      action: 'DISTRIBUTION_ALLOCATED',
      entityType: 'class_distribution',
      entityId: allocationId,
      metadata: {
        batchId,
        classId,
        foodAllocated,
        waterAllocated,
        allocationType,
      },
    });
  }

  /**
   * Log role assignment
   */
  async logRoleChange(
    userId: string,
    roleId: number,
    action: 'ASSIGNED' | 'REMOVED',
  ): Promise<void> {
    await this.log({
      action: `ROLE_${action}`,
      entityType: 'user_role',
      metadata: {
        userId,
        roleId,
      },
    });
  }

  /**
   * Log member transfer
   */
  async logMemberTransfer(
    memberId: string,
    fromClassId: string | null,
    toClassId: string,
  ): Promise<void> {
    await this.log({
      action: 'MEMBER_TRANSFERRED',
      entityType: 'member',
      entityId: memberId,
      metadata: {
        fromClassId,
        toClassId,
      },
    });
  }

  /**
   * Find all activity logs (admin/super_admin only via RLS)
   */
  async findAll(filters?: {
    actorId?: string;
    entityType?: string;
    entityId?: string;
    page?: number;
    limit?: number;
    skip?: number;
    take?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<PaginatedResponse<any>> {
    const pagination: PaginationDto = {
      page: filters?.page,
      limit: filters?.limit,
      skip: filters?.skip,
      take: filters?.take,
    };
    const { skip, take, page, limit } = getPaginationParams(pagination);

    // Build where clause
    const where: any = {};

    if (filters?.actorId) {
      where.actorId = filters.actorId;
    }

    if (filters?.entityType) {
      where.entityType = filters.entityType;
    }

    if (filters?.entityId) {
      where.entityId = filters.entityId;
    }

    // Date range filter
    const dateFilter = buildDateRangeFilter(filters?.dateFrom, filters?.dateTo, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    // Get total count for pagination metadata
    const total = await this.prisma.activityLog.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters?.sortBy, filters?.sortOrder, 'createdAt', 'desc');

    const data = await this.prisma.activityLog.findMany({
      skip,
      take,
      where,
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
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

