import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { HandleRequestDto } from './dto/handle-request.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { RequestStatus } from '@prisma/client';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import {
  buildTextSearchFilter,
  buildDateRangeFilter,
  buildSortOrder,
  parseSearchFields,
} from '../../common/dto/filter.dto';

@Injectable()
export class RequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRequestDto, user: AuthenticatedUser) {
    // RLS ensures user can only create their own requests
    return this.prisma.withRLSContext(async (tx) => {
      return tx.request.create({
        data: {
          type: dto.type,
          description: dto.description,
          requestedBy: user.id,
          status: RequestStatus.PENDING,
        },
        include: {
          requester: {
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

  async findAll(status?: RequestStatus, filters?: any): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters || {});

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    // Text search (on description and type)
    const searchFields = parseSearchFields(filters?.searchFields || 'description,type');
    const searchFilter = buildTextSearchFilter(filters?.search, searchFields.length > 0 ? searchFields : ['description', 'type']);
    if (searchFilter) {
      Object.assign(where, searchFilter);
    }

    // Date range filter
    const dateFilter = buildDateRangeFilter(filters?.dateFrom, filters?.dateTo, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    // Get total count for pagination metadata
    const total = await this.prisma.request.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters?.sortBy, filters?.sortOrder, 'createdAt', 'desc');

    // RLS filters: users see their own, admin/super_admin see all
    const data = await this.prisma.request.findMany({
      skip,
      take,
      where,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        handler: {
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

  async findMyRequests(userId: string, filters?: any): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters || {});

    // Build where clause
    const where: any = {
      requestedBy: userId,
    };

    // Text search
    const searchFields = parseSearchFields(filters?.searchFields || 'description,type');
    const searchFilter = buildTextSearchFilter(filters?.search, searchFields.length > 0 ? searchFields : ['description', 'type']);
    if (searchFilter) {
      Object.assign(where, searchFilter);
    }

    // Date range filter
    const dateFilter = buildDateRangeFilter(filters?.dateFrom, filters?.dateTo, 'createdAt');
    if (dateFilter) {
      Object.assign(where, dateFilter);
    }

    // Get total count for pagination metadata
    const total = await this.prisma.request.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters?.sortBy, filters?.sortOrder, 'createdAt', 'desc');

    // RLS ensures user can only see their own requests
    const data = await this.prisma.request.findMany({
      skip,
      take,
      where,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        handler: {
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

  async findOne(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        handler: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException(`Request with ID ${id} not found`);
    }

    return request;
  }

  async handle(id: string, dto: HandleRequestDto, user: AuthenticatedUser) {
    // RLS ensures only admin/super_admin can update status
    return this.prisma.withRLSContext(async (tx) => {
      const request = await tx.request.findUnique({
        where: { id },
      });

      if (!request) {
        throw new NotFoundException(`Request with ID ${id} not found`);
      }

      if (request.status !== RequestStatus.PENDING) {
        throw new BadRequestException('Only pending requests can be handled');
      }

      return tx.request.update({
        where: { id },
        data: {
          status: dto.status,
          handledBy: user.id,
          resolvedAt: new Date(),
        },
        include: {
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          handler: {
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
}

