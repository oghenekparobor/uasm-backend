import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TransferMemberDto } from './dto/transfer-member.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import { MemberFilterDto } from './dto/member-filter.dto';
import {
  buildTextSearchFilter,
  buildDateRangeFilter,
  buildSortOrder,
  parseSearchFields,
} from '../../common/dto/filter.dto';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateMemberDto, user: AuthenticatedUser) {
    // RLS will enforce that user can only create members in their platoons
    return this.prisma.withRLSContext(async (tx) => {
      return tx.member.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthday: dto.birthday ? new Date(dto.birthday) : null,
          currentClassId: dto.currentClassId,
        },
      });
    });
  }

  async findAll(filters: MemberFilterDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters);

    // Build where clause
    const where: any = {};

    // Text search
    const searchFields = parseSearchFields(filters.searchFields || 'firstName,lastName');
    const searchFilter = buildTextSearchFilter(filters.search, searchFields.length > 0 ? searchFields : ['firstName', 'lastName']);
    if (searchFilter) {
      Object.assign(where, searchFilter);
    }

    // Specific field filters
    if (filters.firstName) {
      where.firstName = {
        contains: filters.firstName,
        mode: 'insensitive',
      };
    }

    if (filters.lastName) {
      where.lastName = {
        contains: filters.lastName,
        mode: 'insensitive',
      };
    }

    if (filters.currentClassId) {
      where.currentClassId = filters.currentClassId;
    }

    // Date range filter (on createdAt)
    const dateFilter = buildDateRangeFilter(filters.dateFrom, filters.dateTo, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    // Get total count for pagination metadata
    const total = await this.prisma.member.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters.sortBy, filters.sortOrder, 'lastName', 'asc');

    // RLS filters results based on user's role and platoon assignments
    const data = await this.prisma.member.findMany({
      skip,
      take,
      where,
      include: {
        currentClass: true,
      },
      orderBy,
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        currentClass: true,
        classHistory: {
          include: {
            fromClass: true,
            toClass: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            transferredAt: 'desc',
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    return member;
  }

  async update(id: string, dto: UpdateMemberDto) {
    // RLS ensures user can only update members in their platoons
    return this.prisma.withRLSContext(async (tx) => {
      return tx.member.update({
        where: { id },
        data: {
          ...(dto.firstName && { firstName: dto.firstName }),
          ...(dto.lastName && { lastName: dto.lastName }),
          ...(dto.birthday && { birthday: new Date(dto.birthday) }),
          ...(dto.currentClassId && { currentClassId: dto.currentClassId }),
        },
      });
    });
  }

  async transfer(id: string, dto: TransferMemberDto, user: AuthenticatedUser) {
    // RLS ensures only admin/super_admin can transfer members
    return this.prisma.withRLSContext(async (tx) => {
      // Get current member to record transfer history (within transaction with RLS context)
      const member = await tx.member.findUnique({
        where: { id },
        select: { currentClassId: true },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${id} not found`);
      }

      // Update member's current class
      const updatedMember = await tx.member.update({
        where: { id },
        data: {
          currentClassId: dto.toClassId,
        },
      });

      // Record transfer history
      await tx.memberClassHistory.create({
        data: {
          memberId: id,
          fromClassId: member.currentClassId,
          toClassId: dto.toClassId,
          transferredBy: user.id,
        },
      });

      // Log member transfer (outside transaction)
      try {
        await this.activityLogs.logMemberTransfer(
          id,
          member.currentClassId,
          dto.toClassId,
        );
      } catch (error) {
        console.error('Failed to log member transfer:', error);
      }

      return updatedMember;
    });
  }

  async getHistory(id: string) {
    // Verify member exists
    const member = await this.prisma.member.findUnique({
      where: { id },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // RLS filters based on role and platoon assignments
    return this.prisma.memberClassHistory.findMany({
      where: { memberId: id },
      include: {
        fromClass: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        toClass: {
          select: {
            id: true,
            name: true,
            type: true,
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
        transferredAt: 'desc',
      },
    });
  }
}

