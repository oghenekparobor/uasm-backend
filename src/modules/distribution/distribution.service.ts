import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';
import { AllocateFoodDto } from './dto/allocate-food.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class DistributionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async confirmReceipt(dto: ConfirmReceiptDto, user: AuthenticatedUser) {
    // RLS ensures only distribution/admin can create batches
    return this.prisma.withRLSContext(async (tx) => {
      return tx.distributionBatch.create({
        data: {
          attendanceWindowId: dto.attendanceWindowId,
          totalFoodReceived: dto.totalFoodReceived,
          totalWaterReceived: dto.totalWaterReceived,
          confirmedBy: user.id,
        },
      });
    });
  }

  async findAllBatches(pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.distributionBatch.count();

    // RLS filters based on role
    const data = await this.prisma.distributionBatch.findMany({
      skip,
      take,
      include: {
        attendanceWindow: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classDistributions: {
          include: {
            class: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOneBatch(id: string) {
    const batch = await this.prisma.distributionBatch.findUnique({
      where: { id },
      include: {
        attendanceWindow: {
          include: {
            classAttendance: {
              include: {
                class: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classDistributions: {
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

    if (!batch) {
      throw new NotFoundException(`Distribution batch with ID ${id} not found`);
    }

    return batch;
  }

  async allocateFood(dto: AllocateFoodDto, user: AuthenticatedUser) {
    // RLS ensures only distribution/admin can create allocations
    return this.prisma.withRLSContext(async (tx) => {
      // Verify batch exists (within transaction with RLS context)
      const batch = await tx.distributionBatch.findUnique({
        where: { id: dto.distributionBatchId },
      });

      if (!batch) {
        throw new NotFoundException(`Distribution batch with ID ${dto.distributionBatchId} not found`);
      }

      const allocation = await tx.classDistribution.create({
        data: {
          distributionBatchId: dto.distributionBatchId,
          classId: dto.classId,
          foodAllocated: dto.foodAllocated,
          waterAllocated: dto.waterAllocated,
          allocationType: dto.allocationType,
          distributedBy: user.id,
        },
      });

      // Log distribution allocation (outside transaction)
      try {
        await this.activityLogs.logDistributionAllocation(
          allocation.id,
          dto.distributionBatchId,
          dto.classId,
          dto.foodAllocated,
          dto.waterAllocated,
          dto.allocationType,
        );
      } catch (error) {
        console.error('Failed to log distribution allocation:', error);
      }

      return allocation;
    });
  }

  async findAllAllocations(batchId?: string, classId?: string, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.classDistribution.count({
      where: {
        ...(batchId && { distributionBatchId: batchId }),
        ...(classId && { classId }),
      },
    });

    // RLS filters based on role and platoon assignments
    const data = await this.prisma.classDistribution.findMany({
      skip,
      take,
      where: {
        ...(batchId && { distributionBatchId: batchId }),
        ...(classId && { classId }),
      },
      include: {
        distributionBatch: {
          include: {
            attendanceWindow: true,
          },
        },
        class: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        distributedAt: 'desc',
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async updateAllocation(id: string, dto: Partial<AllocateFoodDto>) {
    // RLS ensures only distribution/admin can update
    return this.prisma.withRLSContext(async (tx) => {
      return tx.classDistribution.update({
        where: { id },
        data: {
          ...(dto.foodAllocated !== undefined && { foodAllocated: dto.foodAllocated }),
          ...(dto.waterAllocated !== undefined && { waterAllocated: dto.waterAllocated }),
          ...(dto.allocationType && { allocationType: dto.allocationType }),
        },
      });
    });
  }

  async findCurrentBatch() {
    // Find the most recent batch for the current Sunday
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());

    const window = await this.prisma.attendanceWindow.findFirst({
      where: {
        sundayDate: {
          gte: new Date(sunday.setHours(0, 0, 0, 0)),
          lt: new Date(sunday.setHours(23, 59, 59, 999)),
        },
      },
      orderBy: {
        sundayDate: 'desc',
      },
    });

    if (!window) {
      return null;
    }

    return this.prisma.distributionBatch.findFirst({
      where: {
        attendanceWindowId: window.id,
      },
      include: {
        attendanceWindow: true,
        classDistributions: {
          include: {
            class: true,
          },
        },
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });
  }

  async getOverview(batchId?: string) {
    const batch = batchId
      ? await this.prisma.distributionBatch.findUnique({
          where: { id: batchId },
        })
      : await this.findCurrentBatch();

    if (!batch) {
      throw new NotFoundException('No distribution batch found');
    }

    const batchIdToUse = batchId || (batch as any).id;

    const allocations = await this.prisma.classDistribution.findMany({
      where: {
        distributionBatchId: batchIdToUse,
      },
      include: {
        class: true,
      },
    });

    const totalFoodAllocated = allocations.reduce(
      (sum, a) => sum + a.foodAllocated,
      0,
    );
    const totalWaterAllocated = allocations.reduce(
      (sum, a) => sum + a.waterAllocated,
      0,
    );

    return {
      batch: batchId ? batch : (batch as any),
      totals: {
        foodReceived: (batchId ? batch : (batch as any)).totalFoodReceived,
        waterReceived: (batchId ? batch : (batch as any)).totalWaterReceived,
        foodAllocated: totalFoodAllocated,
        waterAllocated: totalWaterAllocated,
        foodRemaining:
          (batchId ? batch : (batch as any)).totalFoodReceived - totalFoodAllocated,
        waterRemaining:
          (batchId ? batch : (batch as any)).totalWaterReceived - totalWaterAllocated,
      },
      allocations: allocations.map((a) => ({
        classId: a.class.id,
        className: a.class.name,
        foodAllocated: a.foodAllocated,
        waterAllocated: a.waterAllocated,
        allocationType: a.allocationType,
      })),
    };
  }

  /**
   * Get all classes with their attendance for a distribution batch
   * This helps determine how much food to allocate to each class
   */
  async getClassesWithAttendance(batchId: string) {
    // Get the batch with its attendance window
    const batch = await this.prisma.distributionBatch.findUnique({
      where: { id: batchId },
      include: {
        attendanceWindow: {
          include: {
            classAttendance: {
              include: {
                class: true,
              },
            },
          },
        },
        classDistributions: true,
      },
    });

    if (!batch) {
      throw new NotFoundException(`Distribution batch with ID ${batchId} not found`);
    }

    // Get member attendance separately
    const memberAttendance = await this.prisma.memberAttendance.findMany({
      where: {
        attendanceWindowId: batch.attendanceWindowId,
      },
      include: {
        member: true,
      },
    });

    // Get all classes with their current member counts
    const allClasses = await this.prisma.class.findMany({
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' },
        { name: 'asc' },
      ],
    });

    // Map classes with their attendance and allocation status
    const classesWithInfo = await Promise.all(
      allClasses.map(async (classItem) => {
        // Find class-level attendance record
        const classAttendance = batch.attendanceWindow.classAttendance.find(
          (ca) => ca.classId === classItem.id,
        );

        // Get all members in this class
        const classMembers = await this.prisma.member.findMany({
          where: { currentClassId: classItem.id },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        });

        // Get member-level attendance for this class
        const memberAttendanceRecords = memberAttendance.filter(
          (ma) => ma.classId === classItem.id,
        );

        // Categorize members by attendance status
        const present = memberAttendanceRecords.filter((ma) => ma.status === 'present').length;
        const absent = memberAttendanceRecords.filter((ma) => ma.status === 'absent').length;
        const marked = memberAttendanceRecords.length;
        const totalMembers = classMembers.length;
        const unmarked = totalMembers - marked;

        // Find allocation record for this class
        const allocation = batch.classDistributions.find(
          (cd) => cd.classId === classItem.id,
        );

        return {
          id: classItem.id,
          name: classItem.name,
          type: classItem.type,
          memberCount: totalMembers,
          attendance: {
            classCount: classAttendance?.count || 0,
            present,
            absent,
            unmarked,
            totalMembers,
            marked,
            hasTaken: !!classAttendance,
            takenAt: classAttendance?.takenAt || null,
            takenBy: classAttendance?.takenBy || null,
          },
          allocation: allocation
            ? {
                id: allocation.id,
                foodAllocated: allocation.foodAllocated,
                waterAllocated: allocation.waterAllocated,
                allocationType: allocation.allocationType,
                distributedAt: allocation.distributedAt,
              }
            : null,
          hasAttendance: !!classAttendance,
          hasAllocation: !!allocation,
        };
      }),
    );

    return {
      batch: {
        id: batch.id,
        attendanceWindowId: batch.attendanceWindowId,
        sundayDate: batch.attendanceWindow.sundayDate,
        totalFoodReceived: batch.totalFoodReceived,
        totalWaterReceived: batch.totalWaterReceived,
        confirmedAt: batch.confirmedAt,
      },
      classes: classesWithInfo,
      summary: {
        totalClasses: allClasses.length,
        classesWithAttendance: classesWithInfo.filter((c) => c.hasAttendance).length,
        classesWithAllocation: classesWithInfo.filter((c) => c.hasAllocation).length,
        totalAttendance: batch.attendanceWindow.classAttendance.reduce(
          (sum, ca) => sum + ca.count,
          0,
        ),
        totalFoodAllocated: batch.classDistributions.reduce(
          (sum, cd) => sum + cd.foodAllocated,
          0,
        ),
        totalWaterAllocated: batch.classDistributions.reduce(
          (sum, cd) => sum + cd.waterAllocated,
          0,
        ),
        totalPresent: classesWithInfo.reduce((sum, c) => sum + c.attendance.present, 0),
        totalAbsent: classesWithInfo.reduce((sum, c) => sum + c.attendance.absent, 0),
        totalUnmarked: classesWithInfo.reduce((sum, c) => sum + c.attendance.unmarked, 0),
      },
    };
  }
}

