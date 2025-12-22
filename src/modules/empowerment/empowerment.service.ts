import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmpowermentDto } from './dto/create-empowerment.dto';
import { ApproveEmpowermentDto } from './dto/approve-empowerment.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { RequestStatus } from '@prisma/client';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class EmpowermentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
  ) {}

  async create(dto: CreateEmpowermentDto, user: AuthenticatedUser) {
    // RLS ensures user can only create empowerment for members in their platoons
    return this.prisma.withRLSContext(async (tx) => {
      // Verify member exists (within transaction with RLS context)
      const member = await tx.member.findUnique({
        where: { id: dto.memberId },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${dto.memberId} not found`);
      }

      return tx.empowermentRequest.create({
        data: {
          memberId: dto.memberId,
          type: dto.type,
          description: dto.description,
          requestedBy: user.id,
          status: RequestStatus.PENDING,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
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

  async findAll(memberId?: string, status?: RequestStatus, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.empowermentRequest.count({
      where: {
        ...(memberId && { memberId }),
        ...(status && { status }),
      },
    });

    // RLS filters based on role and platoon assignments
    const data = await this.prisma.empowermentRequest.findMany({
      skip,
      take,
      where: {
        ...(memberId && { memberId }),
        ...(status && { status }),
      },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            currentClass: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const empowerment = await this.prisma.empowermentRequest.findUnique({
      where: { id },
      include: {
        member: {
          include: {
            currentClass: true,
          },
        },
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        approver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!empowerment) {
      throw new NotFoundException(`Empowerment request with ID ${id} not found`);
    }

    return empowerment;
  }

  async approve(id: string, dto: ApproveEmpowermentDto, user: AuthenticatedUser) {
    // RLS ensures only admin/super_admin can update status
    return this.prisma.withRLSContext(async (tx) => {
      const empowerment = await tx.empowermentRequest.findUnique({
        where: { id },
      });

      if (!empowerment) {
        throw new NotFoundException(`Empowerment request with ID ${id} not found`);
      }

      if (empowerment.status !== RequestStatus.PENDING) {
        throw new BadRequestException('Only pending empowerment requests can be approved/rejected');
      }

      const updated = await tx.empowermentRequest.update({
        where: { id },
        data: {
          status: RequestStatus.APPROVED,
          approvedBy: user.id,
          approvedAt: new Date(),
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Log empowerment approval (outside transaction)
      try {
        await this.activityLogs.logEmpowermentApproval(
          id,
          empowerment.memberId,
          RequestStatus.APPROVED,
        );
      } catch (error) {
        console.error('Failed to log empowerment approval:', error);
      }

      return updated;
    });
  }

  async reject(id: string, dto: ApproveEmpowermentDto, user: AuthenticatedUser) {
    // RLS ensures only admin/super_admin can update status
    return this.prisma.withRLSContext(async (tx) => {
      const empowerment = await tx.empowermentRequest.findUnique({
        where: { id },
      });

      if (!empowerment) {
        throw new NotFoundException(`Empowerment request with ID ${id} not found`);
      }

      if (empowerment.status !== RequestStatus.PENDING) {
        throw new BadRequestException('Only pending empowerment requests can be rejected');
      }

      const updated = await tx.empowermentRequest.update({
        where: { id },
        data: {
          status: RequestStatus.REJECTED,
          approvedBy: user.id,
          approvedAt: new Date(),
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          requester: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          approver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Log empowerment rejection (outside transaction)
      try {
        await this.activityLogs.logEmpowermentApproval(
          id,
          empowerment.memberId,
          RequestStatus.REJECTED,
        );
      } catch (error) {
        console.error('Failed to log empowerment rejection:', error);
      }

      return updated;
    });
  }
}

