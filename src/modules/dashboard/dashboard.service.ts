import { Injectable } from '@nestjs/common';
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

  private async getPlatoonStats(user: AuthenticatedUser, dateFilter?: any) {
    if (!user.platoonIds || user.platoonIds.length === 0) {
      return {
        totalMembers: 0,
        totalAttendance: 0,
        totalLogs: 0,
        totalEmpowerments: 0,
      };
    }

    const where: any = {
      currentClassId: {
        in: user.platoonIds,
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

    // Get attendance for members in these platoons
    const attendanceWhere: any = {
      class: {
        id: {
          in: user.platoonIds,
        },
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
      platoonIds: user.platoonIds,
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

