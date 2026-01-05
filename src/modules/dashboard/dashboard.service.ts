import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DashboardPeriod } from './dto/dashboard-stats.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get dashboard statistics
   * Returns different stats based on user role:
   * - Admin/Super Admin: System-wide stats
   * - Leaders: Stats for their assigned platoons
   * - Distribution: Distribution-related stats
   * - Kitchen: Kitchen-related stats
   */
  async getStats(user: AuthenticatedUser, period?: DashboardPeriod) {
    const dateFilter = this.getDateFilter(period);

    // Base stats available to all authenticated users
    const baseStats = {
      totalUsers: await this.getTotalUsers(user),
      totalMembers: await this.getTotalMembers(user),
      totalClasses: await this.getTotalClasses(user),
      pendingApprovals: await this.getPendingApprovals(user),
      recentActivity: await this.getRecentActivity(user, dateFilter),
    };

    // Role-specific stats
    const roleStats: any = {};

    if (user.role === 'admin' || user.role === 'super_admin') {
      roleStats.systemStats = {
        totalEmpowermentRequests: await this.getTotalEmpowermentRequests(dateFilter),
        totalRequests: await this.getTotalRequests(dateFilter),
        totalEvents: await this.getTotalEvents(dateFilter),
        attendanceStats: await this.getAttendanceStats(dateFilter),
        distributionStats: await this.getDistributionStats(dateFilter),
        offeringsStats: await this.getOfferingsStats(dateFilter),
      };
    }

    if (user.role === 'distribution' || user.role === 'admin' || user.role === 'super_admin') {
      roleStats.distributionStats = await this.getDistributionStats(dateFilter);
    }

    if (user.role === 'kitchen' || user.role === 'admin' || user.role === 'super_admin') {
      roleStats.kitchenStats = await this.getKitchenStats(dateFilter);
    }

    if (
      user.role === 'platoon_leader' ||
      user.role === 'assistant_platoon_leader' ||
      user.role === 'children_teacher' ||
      user.role === 'admin' ||
      user.role === 'super_admin'
    ) {
      roleStats.platoonStats = await this.getPlatoonStats(user, dateFilter);
    }

    return {
      ...baseStats,
      ...roleStats,
      period: period || DashboardPeriod.ALL,
    };
  }

  /**
   * Get overview statistics (quick counts)
   */
  async getOverview(user: AuthenticatedUser) {
    return {
      users: await this.getTotalUsers(user),
      members: await this.getTotalMembers(user),
      classes: await this.getTotalClasses(user),
      pendingEmpowerments: await this.prisma.empowermentRequest.count({
        where: { status: 'PENDING' },
      }),
      pendingRequests: await this.prisma.request.count({
        where: { status: 'PENDING' },
      }),
      pendingEvents: await this.prisma.event.count({
        where: { status: 'PENDING' },
      }),
    };
  }

  private async getTotalUsers(user: AuthenticatedUser): Promise<number> {
    // RLS filters based on role
    return this.prisma.user.count();
  }

  private async getTotalMembers(user: AuthenticatedUser): Promise<number> {
    // RLS filters based on role and platoon assignments
    return this.prisma.member.count();
  }

  private async getTotalClasses(user: AuthenticatedUser): Promise<number> {
    // RLS filters: admin sees all, leaders see assigned
    return this.prisma.class.count();
  }

  private async getPendingApprovals(user: AuthenticatedUser) {
    // RLS filters based on role
    const [empowerments, requests, events] = await Promise.all([
      this.prisma.empowermentRequest.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.request.count({
        where: { status: 'PENDING' },
      }),
      this.prisma.event.count({
        where: { status: 'PENDING' },
      }),
    ]);

    return {
      empowermentRequests: empowerments,
      generalRequests: requests,
      events: events,
      total: empowerments + requests + events,
    };
  }

  private async getRecentActivity(user: AuthenticatedUser, dateFilter?: any) {
    // RLS filters based on role
    const where: any = {};
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    return this.prisma.activityLog.findMany({
      where,
      take: 10,
      orderBy: {
        createdAt: 'desc',
      },
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
    });
  }

  private async getTotalEmpowermentRequests(dateFilter?: any) {
    const where: any = {};
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.empowermentRequest.count({ where }),
      this.prisma.empowermentRequest.count({
        where: { ...where, status: 'PENDING' },
      }),
      this.prisma.empowermentRequest.count({
        where: { ...where, status: 'APPROVED' },
      }),
      this.prisma.empowermentRequest.count({
        where: { ...where, status: 'REJECTED' },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }

  private async getTotalRequests(dateFilter?: any) {
    const where: any = {};
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const [total, pending, approved, rejected] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.count({
        where: { ...where, status: 'PENDING' },
      }),
      this.prisma.request.count({
        where: { ...where, status: 'APPROVED' },
      }),
      this.prisma.request.count({
        where: { ...where, status: 'REJECTED' },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
    };
  }

  private async getTotalEvents(dateFilter?: any) {
    const where: any = {};
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const [total, pending, approved] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.count({
        where: { ...where, status: 'PENDING' },
      }),
      this.prisma.event.count({
        where: { ...where, status: 'APPROVED' },
      }),
    ]);

    return {
      total,
      pending,
      approved,
    };
  }

  private async getAttendanceStats(dateFilter?: any) {
    const where: any = {};
    if (dateFilter) {
      where.takenAt = dateFilter;
    }

    const totalRecords = await this.prisma.classAttendance.count({ where });

    const attendanceRecords = await this.prisma.classAttendance.findMany({
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
      },
    });

    const totalAttendance = attendanceRecords.reduce((sum, record) => sum + record.count, 0);

    // Group by class
    const byClass = attendanceRecords.reduce((acc, record) => {
      const classId = record.classId;
      if (!acc[classId]) {
        acc[classId] = {
          classId,
          className: record.class.name,
          classType: record.class.type,
          totalAttendance: 0,
          records: 0,
        };
      }
      acc[classId].totalAttendance += record.count;
      acc[classId].records += 1;
      return acc;
    }, {} as Record<string, any>);

    return {
      totalRecords,
      totalAttendance,
      averagePerRecord: totalRecords > 0 ? totalAttendance / totalRecords : 0,
      byClass: Object.values(byClass),
    };
  }

  private async getDistributionStats(dateFilter?: any) {
    const where: any = {};
    if (dateFilter) {
      where.confirmedAt = dateFilter;
    }

    const batches = await this.prisma.distributionBatch.findMany({
      where,
      include: {
        classDistributions: true,
      },
    });

    const totalBatches = batches.length;
    const totalFoodReceived = batches.reduce((sum, b) => sum + b.totalFoodReceived, 0);
    const totalWaterReceived = batches.reduce((sum, b) => sum + b.totalWaterReceived, 0);

    const allocations = batches.flatMap((b) => b.classDistributions);
    const totalFoodAllocated = allocations.reduce((sum, a) => sum + a.foodAllocated, 0);
    const totalWaterAllocated = allocations.reduce((sum, a) => sum + a.waterAllocated, 0);

    return {
      totalBatches,
      totalFoodReceived,
      totalWaterReceived,
      totalFoodAllocated,
      totalWaterAllocated,
      foodRemaining: totalFoodReceived - totalFoodAllocated,
      waterRemaining: totalWaterReceived - totalWaterAllocated,
    };
  }

  async getDistributionAnalytics(period?: DashboardPeriod) {
    const dateFilter = this.getDateFilter(period);
    const where: any = {};
    if (dateFilter) {
      where.confirmedAt = dateFilter;
    }

    // Get all batches with full details
    const batches = await this.prisma.distributionBatch.findMany({
      where,
      include: {
        attendanceWindow: {
          select: {
            id: true,
            sundayDate: true,
          },
        },
        classDistributions: {
          include: {
            class: {
              select: {
                id: true,
                name: true,
                type: true,
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
      },
      orderBy: {
        confirmedAt: 'desc',
      },
    });

    // Calculate summary
    const totalBatches = batches.length;
    const totalFoodReceived = batches.reduce((sum, b) => sum + b.totalFoodReceived, 0);
    const totalWaterReceived = batches.reduce((sum, b) => sum + b.totalWaterReceived, 0);

    const allocations = batches.flatMap((b) => b.classDistributions);
    const totalFoodAllocated = allocations.reduce((sum, a) => sum + a.foodAllocated, 0);
    const totalWaterAllocated = allocations.reduce((sum, a) => sum + a.waterAllocated, 0);

    // Breakdown by class
    const byClassMap = new Map<string, {
      classId: string;
      className: string;
      classType: string;
      totalFoodAllocated: number;
      totalWaterAllocated: number;
      allocationCount: number;
    }>();

    allocations.forEach((allocation) => {
      const classId = allocation.classId;
      if (!byClassMap.has(classId)) {
        byClassMap.set(classId, {
          classId,
          className: allocation.class.name,
          classType: allocation.class.type,
          totalFoodAllocated: 0,
          totalWaterAllocated: 0,
          allocationCount: 0,
        });
      }

      const classData = byClassMap.get(classId)!;
      classData.totalFoodAllocated += allocation.foodAllocated;
      classData.totalWaterAllocated += allocation.waterAllocated;
      classData.allocationCount += 1;
    });

    const byClass = Array.from(byClassMap.values()).sort(
      (a, b) => b.totalFoodAllocated - a.totalFoodAllocated
    );

    // Breakdown by month
    const byMonthMap = new Map<string, {
      monthKey: string;
      month: string;
      batches: number;
      totalFoodReceived: number;
      totalWaterReceived: number;
      totalFoodAllocated: number;
      totalWaterAllocated: number;
    }>();

    batches.forEach((batch) => {
      const date = new Date(batch.attendanceWindow.sundayDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, {
          monthKey,
          month: monthLabel,
          batches: 0,
          totalFoodReceived: 0,
          totalWaterReceived: 0,
          totalFoodAllocated: 0,
          totalWaterAllocated: 0,
        });
      }

      const monthData = byMonthMap.get(monthKey)!;
      monthData.batches += 1;
      monthData.totalFoodReceived += batch.totalFoodReceived;
      monthData.totalWaterReceived += batch.totalWaterReceived;

      const batchAllocations = batch.classDistributions;
      monthData.totalFoodAllocated += batchAllocations.reduce((sum, a) => sum + a.foodAllocated, 0);
      monthData.totalWaterAllocated += batchAllocations.reduce((sum, a) => sum + a.waterAllocated, 0);
    });

    const byMonth = Array.from(byMonthMap.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );

    // Breakdown by batch (recent batches)
    const byBatch = batches.slice(0, 20).map((batch) => {
      const batchAllocations = batch.classDistributions;
      const batchFoodAllocated = batchAllocations.reduce((sum, a) => sum + a.foodAllocated, 0);
      const batchWaterAllocated = batchAllocations.reduce((sum, a) => sum + a.waterAllocated, 0);

      return {
        batchId: batch.id,
        sundayDate: batch.attendanceWindow.sundayDate,
        confirmedAt: batch.confirmedAt,
        confirmedBy: `${batch.user.firstName} ${batch.user.lastName}`,
        totalFoodReceived: batch.totalFoodReceived,
        totalWaterReceived: batch.totalWaterReceived,
        totalFoodAllocated: batchFoodAllocated,
        totalWaterAllocated: batchWaterAllocated,
        foodRemaining: batch.totalFoodReceived - batchFoodAllocated,
        waterRemaining: batch.totalWaterReceived - batchWaterAllocated,
        allocationCount: batchAllocations.length,
      };
    });

    return {
      summary: {
        totalBatches,
        totalFoodReceived,
        totalWaterReceived,
        totalFoodAllocated,
        totalWaterAllocated,
        foodRemaining: totalFoodReceived - totalFoodAllocated,
        waterRemaining: totalWaterReceived - totalWaterAllocated,
        utilizationRate: totalFoodReceived > 0 
          ? ((totalFoodAllocated / totalFoodReceived) * 100).toFixed(1)
          : '0',
      },
      byClass,
      byMonth,
      byBatch,
      period: period || DashboardPeriod.ALL,
    };
  }

  private async getKitchenStats(dateFilter?: any) {
    const where: any = {};
    if (dateFilter) {
      where.createdAt = dateFilter;
    }

    const [totalRecipes, productionLogs] = await Promise.all([
      this.prisma.kitchenRecipe.count(),
      this.prisma.kitchenProductionLog.findMany({
        where,
        include: {
          recipe: true,
        },
      }),
    ]);

    const totalProduction = productionLogs.reduce((sum, log) => sum + log.quantity, 0);

    return {
      totalRecipes,
      totalProductionLogs: productionLogs.length,
      totalProduction,
      averageProduction: productionLogs.length > 0 ? totalProduction / productionLogs.length : 0,
    };
  }

  private async getOfferingsStats(dateFilter?: { gte: Date; lte: Date }) {
    const where: any = {};
    if (dateFilter) {
      where.recordedAt = dateFilter;
    }

    const totalRecords = await this.prisma.classOffering.count({ where });

    const totals = await this.prisma.classOffering.aggregate({
      where,
      _sum: {
        offeringAmount: true,
        titheAmount: true,
      },
    });

    return {
      totalRecords,
      totalOffering: totals._sum.offeringAmount?.toNumber() || 0,
      totalTithe: totals._sum.titheAmount?.toNumber() || 0,
      totalCombined: (totals._sum.offeringAmount?.toNumber() || 0) + (totals._sum.titheAmount?.toNumber() || 0),
    };
  }

  /**
   * GET /dashboard/attendance/analytics
   * Get detailed member attendance analytics
   * Only accessible to admin and super_admin
   */
  async getAttendanceAnalytics(period?: DashboardPeriod, user?: AuthenticatedUser) {
    // Only admin and super_admin can access attendance analytics
    if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
      throw new ForbiddenException('Only administrators can access attendance analytics');
    }

    const dateFilter = this.getDateFilter(period);
    const where: any = {};
    if (dateFilter) {
      where.markedAt = dateFilter;
    }

    // Get all member attendance records with full details
    const attendanceRecords = await this.prisma.memberAttendance.findMany({
      where,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
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
            opensAt: true,
            closesAt: true,
          },
        },
      },
      orderBy: {
        markedAt: 'desc',
      },
    });

    // Calculate summary
    const totalRecords = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
    const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length;
    const attendanceRate = totalRecords > 0 ? ((presentCount / totalRecords) * 100).toFixed(1) : '0';

    // Breakdown by class
    const byClassMap = new Map<string, {
      classId: string;
      className: string;
      classType: string;
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: string;
    }>();

    attendanceRecords.forEach((record) => {
      const classId = record.classId;
      if (!byClassMap.has(classId)) {
        byClassMap.set(classId, {
          classId,
          className: record.class.name,
          classType: record.class.type,
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          attendanceRate: '0',
        });
      }

      const classData = byClassMap.get(classId)!;
      classData.totalRecords += 1;
      if (record.status === 'present') {
        classData.presentCount += 1;
      } else {
        classData.absentCount += 1;
      }
    });

    // Calculate attendance rate for each class
    byClassMap.forEach((classData) => {
      classData.attendanceRate = classData.totalRecords > 0
        ? ((classData.presentCount / classData.totalRecords) * 100).toFixed(1)
        : '0';
    });

    const byClass = Array.from(byClassMap.values()).sort(
      (a, b) => parseFloat(b.attendanceRate) - parseFloat(a.attendanceRate)
    );

    // Breakdown by month
    const byMonthMap = new Map<string, {
      monthKey: string;
      month: string;
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: string;
    }>();

    attendanceRecords.forEach((record) => {
      const date = new Date(record.markedAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, {
          monthKey,
          month: monthLabel,
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          attendanceRate: '0',
        });
      }

      const monthData = byMonthMap.get(monthKey)!;
      monthData.totalRecords += 1;
      if (record.status === 'present') {
        monthData.presentCount += 1;
      } else {
        monthData.absentCount += 1;
      }
    });

    // Calculate attendance rate for each month
    byMonthMap.forEach((monthData) => {
      monthData.attendanceRate = monthData.totalRecords > 0
        ? ((monthData.presentCount / monthData.totalRecords) * 100).toFixed(1)
        : '0';
    });

    const byMonth = Array.from(byMonthMap.values()).sort((a, b) =>
      b.monthKey.localeCompare(a.monthKey)
    );

    // Breakdown by attendance window (recent windows)
    const byWindowMap = new Map<string, {
      windowId: string;
      sundayDate: Date;
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: string;
    }>();

    attendanceRecords.forEach((record) => {
      const windowId = record.attendanceWindowId;
      if (!byWindowMap.has(windowId)) {
        byWindowMap.set(windowId, {
          windowId,
          sundayDate: record.attendanceWindow.sundayDate,
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          attendanceRate: '0',
        });
      }

      const windowData = byWindowMap.get(windowId)!;
      windowData.totalRecords += 1;
      if (record.status === 'present') {
        windowData.presentCount += 1;
      } else {
        windowData.absentCount += 1;
      }
    });

    // Calculate attendance rate for each window
    byWindowMap.forEach((windowData) => {
      windowData.attendanceRate = windowData.totalRecords > 0
        ? ((windowData.presentCount / windowData.totalRecords) * 100).toFixed(1)
        : '0';
    });

    const byWindow = Array.from(byWindowMap.values())
      .sort((a, b) => b.sundayDate.getTime() - a.sundayDate.getTime())
      .slice(0, 20);

    // Daily trends (last 30 days)
    const dailyTrendsMap = new Map<string, {
      date: string;
      dateKey: string;
      totalRecords: number;
      presentCount: number;
      absentCount: number;
      attendanceRate: string;
    }>();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    attendanceRecords
      .filter((r) => new Date(r.markedAt) >= thirtyDaysAgo)
      .forEach((record) => {
        const date = new Date(record.markedAt);
        const dateKey = date.toISOString().split('T')[0];
        const dateLabel = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        if (!dailyTrendsMap.has(dateKey)) {
          dailyTrendsMap.set(dateKey, {
            date: dateLabel,
            dateKey,
            totalRecords: 0,
            presentCount: 0,
            absentCount: 0,
            attendanceRate: '0',
          });
        }

        const dayData = dailyTrendsMap.get(dateKey)!;
        dayData.totalRecords += 1;
        if (record.status === 'present') {
          dayData.presentCount += 1;
        } else {
          dayData.absentCount += 1;
        }
      });

    // Calculate attendance rate for each day
    dailyTrendsMap.forEach((dayData) => {
      dayData.attendanceRate = dayData.totalRecords > 0
        ? ((dayData.presentCount / dayData.totalRecords) * 100).toFixed(1)
        : '0';
    });

    const dailyTrends = Array.from(dailyTrendsMap.values())
      .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
      .slice(-30);

    return {
      summary: {
        totalRecords,
        presentCount,
        absentCount,
        attendanceRate,
      },
      byClass,
      byMonth,
      byWindow,
      dailyTrends,
      period: period || DashboardPeriod.ALL,
    };
  }

  async getOfferingsAnalytics(period?: DashboardPeriod) {
    const dateFilter = this.getDateFilter(period);
    const where: any = {};
    if (dateFilter) {
      where.recordedAt = dateFilter;
    }

    // Get overall totals
    const totals = await this.prisma.classOffering.aggregate({
      where,
      _sum: {
        offeringAmount: true,
        titheAmount: true,
      },
      _count: true,
    });

    // Get breakdown by class
    const byClass = await this.prisma.classOffering.groupBy({
      by: ['classId'],
      where,
      _sum: {
        offeringAmount: true,
        titheAmount: true,
      },
      _count: true,
    });

    // Get class details
    const classIds = byClass.map((item) => item.classId);
    const classes = await this.prisma.class.findMany({
      where: { id: { in: classIds } },
      select: {
        id: true,
        name: true,
        type: true,
      },
    });

    const classesMap = new Map(classes.map((c) => [c.id, c]));

    const byClassWithDetails = byClass.map((item) => {
      const classInfo = classesMap.get(item.classId);
      return {
        classId: item.classId,
        className: classInfo?.name || 'Unknown',
        classType: classInfo?.type || 'UNKNOWN',
        totalOffering: item._sum.offeringAmount?.toNumber() || 0,
        totalTithe: item._sum.titheAmount?.toNumber() || 0,
        totalCombined: (item._sum.offeringAmount?.toNumber() || 0) + (item._sum.titheAmount?.toNumber() || 0),
        recordCount: item._count,
      };
    });

    // Get breakdown by attendance window (month)
    const byWindow = await this.prisma.classOffering.findMany({
      where,
      include: {
        attendanceWindow: {
          select: {
            id: true,
            sundayDate: true,
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
      orderBy: {
        recordedAt: 'desc',
      },
    });

    // Group by month
    const byMonthMap = new Map<string, {
      monthKey: string;
      month: string;
      totalOffering: number;
      totalTithe: number;
      totalCombined: number;
      recordCount: number;
    }>();

    byWindow.forEach((item) => {
      const date = new Date(item.attendanceWindow.sundayDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!byMonthMap.has(monthKey)) {
        byMonthMap.set(monthKey, {
          monthKey,
          month: monthLabel,
          totalOffering: 0,
          totalTithe: 0,
          totalCombined: 0,
          recordCount: 0,
        });
      }

      const monthData = byMonthMap.get(monthKey)!;
      monthData.totalOffering += item.offeringAmount.toNumber();
      monthData.totalTithe += item.titheAmount.toNumber();
      monthData.totalCombined += item.offeringAmount.toNumber() + item.titheAmount.toNumber();
      monthData.recordCount += 1;
    });

    const byMonth = Array.from(byMonthMap.values()).sort((a, b) => 
      b.monthKey.localeCompare(a.monthKey)
    );

    return {
      summary: {
        totalRecords: totals._count,
        totalOffering: totals._sum.offeringAmount?.toNumber() || 0,
        totalTithe: totals._sum.titheAmount?.toNumber() || 0,
        totalCombined: (totals._sum.offeringAmount?.toNumber() || 0) + (totals._sum.titheAmount?.toNumber() || 0),
      },
      byClass: byClassWithDetails.sort((a, b) => b.totalCombined - a.totalCombined),
      byMonth,
      period: period || DashboardPeriod.ALL,
    };
  }

  private async getPlatoonStats(user: AuthenticatedUser, dateFilter?: any) {
    // For admin/super_admin, show stats for all platoons (type = PLATOON)
    // For leaders/teachers, show stats for their assigned platoons only
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    
    let classIds: string[] = [];
    
    if (isAdmin) {
      // Get all platoon class IDs
      const platoonClasses = await this.prisma.class.findMany({
        where: { type: 'PLATOON' },
        select: { id: true },
      });
      classIds = platoonClasses.map((c) => c.id);
    } else {
      // Use assigned platoon IDs
      if (!user.platoonIds || user.platoonIds.length === 0) {
        return {
          totalMembers: 0,
          totalAttendance: 0,
          totalLogs: 0,
          totalEmpowerments: 0,
          platoonIds: [],
        };
      }
      classIds = user.platoonIds;
    }

    if (classIds.length === 0) {
      return {
        totalMembers: 0,
        totalAttendance: 0,
        totalLogs: 0,
        totalEmpowerments: 0,
        platoonIds: [],
      };
    }

    const where: any = {
      currentClassId: {
        in: classIds,
      },
    };

    const [totalMembers, members] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.findMany({
        where,
        select: { id: true },
      }),
    ]);

    const memberIds = members.map((m) => m.id);

    // If no members found, return zeros for all stats
    if (memberIds.length === 0) {
      return {
        totalMembers: 0,
        totalAttendance: 0,
        totalLogs: 0,
        totalEmpowerments: 0,
        platoonIds: classIds,
      };
    }

    // Get attendance for members in these platoons
    const attendanceWhere: any = {
      classId: {
        in: classIds,
      },
    };
    if (dateFilter) {
      attendanceWhere.takenAt = dateFilter;
    }

    const attendanceRecords = await this.prisma.classAttendance.findMany({
      where: attendanceWhere,
    });
    const totalAttendance = attendanceRecords.reduce((sum, r) => sum + r.count, 0);

    // Get logs for members in these platoons
    const logsWhere: any = {
      memberId: {
        in: memberIds,
      },
    };
    if (dateFilter) {
      logsWhere.createdAt = dateFilter;
    }

    const totalLogs = await this.prisma.memberLog.count({ where: logsWhere });

    // Get empowerment requests for members in these platoons
    const empowermentWhere: any = {
      memberId: {
        in: memberIds,
      },
    };
    if (dateFilter) {
      empowermentWhere.createdAt = dateFilter;
    }

    const totalEmpowerments = await this.prisma.empowermentRequest.count({
      where: empowermentWhere,
    });

    return {
      totalMembers,
      totalAttendance,
      totalLogs,
      totalEmpowerments,
      platoonIds: classIds,
    };
  }

  private getDateFilter(period?: DashboardPeriod): any {
    if (!period || period === DashboardPeriod.ALL) {
      return undefined;
    }

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case DashboardPeriod.TODAY:
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case DashboardPeriod.WEEK:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case DashboardPeriod.MONTH:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
      case DashboardPeriod.YEAR:
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return undefined;
    }

    return {
      gte: startDate,
      lte: new Date(),
    };
  }
}

