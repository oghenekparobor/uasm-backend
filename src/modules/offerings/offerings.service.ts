import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import { BaseFilterDto, buildSortOrder } from '../../common/dto/filter.dto';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class OfferingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOfferingDto, user: AuthenticatedUser) {
    // RLS ensures user can only create offerings for classes they lead
    return this.prisma.withRLSContext(async (tx) => {
      // Verify class exists
      const classExists = await tx.class.findUnique({
        where: { id: dto.classId },
      });

      if (!classExists) {
        throw new NotFoundException(`Class with ID ${dto.classId} not found`);
      }

      // Verify attendance window exists
      const windowExists = await tx.attendanceWindow.findUnique({
        where: { id: dto.attendanceWindowId },
      });

      if (!windowExists) {
        throw new NotFoundException(`Attendance window with ID ${dto.attendanceWindowId} not found`);
      }

      return tx.classOffering.upsert({
        where: {
          classId_attendanceWindowId: {
            classId: dto.classId,
            attendanceWindowId: dto.attendanceWindowId,
          },
        },
        update: {
          offeringAmount: new Decimal(dto.offeringAmount),
          titheAmount: new Decimal(dto.titheAmount),
          notes: dto.notes,
          recordedBy: user.id,
          recordedAt: new Date(),
        },
        create: {
          classId: dto.classId,
          attendanceWindowId: dto.attendanceWindowId,
          offeringAmount: new Decimal(dto.offeringAmount),
          titheAmount: new Decimal(dto.titheAmount),
          notes: dto.notes,
          recordedBy: user.id,
        },
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
      });
    });
  }

  async findAll(classId?: string, attendanceWindowId?: string, filters?: BaseFilterDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters || {});

    const where: any = {};
    if (classId) {
      where.classId = classId;
    }
    if (attendanceWindowId) {
      where.attendanceWindowId = attendanceWindowId;
    }

    // Get total count for pagination metadata
    const total = await this.prisma.classOffering.count({ where });

    // Build sort order
    const orderBy = buildSortOrder(filters?.sortBy, filters?.sortOrder, 'recordedAt', 'desc');

    // RLS filters based on role and class assignments
    const data = await this.prisma.classOffering.findMany({
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
            opensAt: true,
            closesAt: true,
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

    // Convert Decimal to number for JSON serialization
    const serializedData = data.map((item) => ({
      ...item,
      offeringAmount: item.offeringAmount.toNumber(),
      titheAmount: item.titheAmount.toNumber(),
    }));

    return {
      data: serializedData,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const offering = await this.prisma.classOffering.findUnique({
      where: { id },
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
            opensAt: true,
            closesAt: true,
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

    if (!offering) {
      throw new NotFoundException(`Offering with ID ${id} not found`);
    }

    // Convert Decimal to number for JSON serialization
    return {
      ...offering,
      offeringAmount: offering.offeringAmount.toNumber(),
      titheAmount: offering.titheAmount.toNumber(),
    };
  }

  async update(id: string, dto: UpdateOfferingDto, user: AuthenticatedUser) {
    // RLS ensures user can only update offerings for classes they lead
    return this.prisma.withRLSContext(async (tx) => {
      const existing = await tx.classOffering.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new NotFoundException(`Offering with ID ${id} not found`);
      }

      const updateData: any = {
        recordedBy: user.id,
        recordedAt: new Date(),
      };

      if (dto.offeringAmount !== undefined) {
        updateData.offeringAmount = new Decimal(dto.offeringAmount);
      }
      if (dto.titheAmount !== undefined) {
        updateData.titheAmount = new Decimal(dto.titheAmount);
      }
      if (dto.notes !== undefined) {
        updateData.notes = dto.notes;
      }

      const updated = await tx.classOffering.update({
        where: { id },
        data: updateData,
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
      });

      // Convert Decimal to number for JSON serialization
      return {
        ...updated,
        offeringAmount: updated.offeringAmount.toNumber(),
        titheAmount: updated.titheAmount.toNumber(),
      };
    });
  }

  async getTotalOfferings(classId?: string, attendanceWindowId?: string): Promise<{ totalOffering: number; totalTithe: number }> {
    const where: any = {};
    if (classId) {
      where.classId = classId;
    }
    if (attendanceWindowId) {
      where.attendanceWindowId = attendanceWindowId;
    }

    const result = await this.prisma.classOffering.aggregate({
      where,
      _sum: {
        offeringAmount: true,
        titheAmount: true,
      },
    });

    return {
      totalOffering: result._sum.offeringAmount?.toNumber() || 0,
      totalTithe: result._sum.titheAmount?.toNumber() || 0,
    };
  }
}

