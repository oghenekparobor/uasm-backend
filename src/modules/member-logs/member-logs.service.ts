import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateMemberLogDto } from './dto/create-member-log.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { UploadService } from '../upload/upload.service';
import { Express } from 'express';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';

@Injectable()
export class MemberLogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateMemberLogDto, user: AuthenticatedUser) {
    // RLS ensures user can only create logs for members in their platoons
    return this.prisma.withRLSContext(async (tx) => {
      // Verify member exists (within transaction with RLS context)
      const member = await tx.member.findUnique({
        where: { id: dto.memberId },
      });

      if (!member) {
        throw new NotFoundException(`Member with ID ${dto.memberId} not found`);
      }

      return tx.memberLog.create({
        data: {
          memberId: dto.memberId,
          note: dto.note,
          createdBy: user.id,
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
          attachments: true,
        },
      });
    });
  }

  async findAll(memberId?: string, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.memberLog.count({
      where: {
        ...(memberId && { memberId }),
      },
    });

    // RLS filters based on role and platoon assignments
    const data = await this.prisma.memberLog.findMany({
      skip,
      take,
      where: {
        ...(memberId && { memberId }),
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
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: true,
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
    const log = await this.prisma.memberLog.findUnique({
      where: { id },
      include: {
        member: {
          include: {
            currentClass: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: true,
      },
    });

    if (!log) {
      throw new NotFoundException(`Member log with ID ${id} not found`);
    }

    return log;
  }

  async update(id: string, note: string) {
    // RLS ensures user can only update their own logs
    return this.prisma.withRLSContext(async (tx) => {
      return tx.memberLog.update({
        where: { id },
        data: {
          note,
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
          attachments: true,
        },
      });
    });
  }

  async delete(id: string) {
    // RLS ensures only admin/super_admin can delete
    return this.prisma.withRLSContext(async (tx) => {
      return tx.memberLog.delete({
        where: { id },
      });
    });
  }

  async addAttachment(
    logId: string,
    dto: { fileUrl: string; fileType: string; fileSize: number },
  ) {
    // RLS ensures user can only add attachments to logs they created
    return this.prisma.withRLSContext(async (tx) => {
      // Verify log exists (within transaction with RLS context)
      const log = await tx.memberLog.findUnique({
        where: { id: logId },
      });

      if (!log) {
        throw new NotFoundException(`Member log with ID ${logId} not found`);
      }

      return tx.memberLogAttachment.create({
        data: {
          memberLogId: logId,
          fileUrl: dto.fileUrl,
          fileType: dto.fileType as any,
          fileSize: dto.fileSize,
        },
      });
    });
  }

  async addAttachmentFromUpload(
    logId: string,
    file: Express.Multer.File,
  ) {
    // Verify log exists first (before upload to avoid unnecessary uploads)
    const log = await this.prisma.memberLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw new NotFoundException(`Member log with ID ${logId} not found`);
    }

    // Upload file to Cloudinary (outside transaction)
    const uploadResult = await this.uploadService.uploadFile(
      file,
      `uams/member-logs/${logId}`,
    );

    // Map MIME type to FileType enum
    const fileTypeMap: Record<string, 'IMAGE' | 'PDF'> = {
      'image/jpeg': 'IMAGE',
      'image/png': 'IMAGE',
      'image/gif': 'IMAGE',
      'image/webp': 'IMAGE',
      'application/pdf': 'PDF',
    };

    const fileType = fileTypeMap[file.mimetype] || 'IMAGE';

    // RLS ensures user can only add attachments to logs they created
    return this.prisma.withRLSContext(async (tx) => {
      return tx.memberLogAttachment.create({
        data: {
          memberLogId: logId,
          fileUrl: uploadResult.secureUrl,
          fileType: fileType,
          fileSize: uploadResult.bytes,
        },
        include: {
          memberLog: {
            select: {
              id: true,
              memberId: true,
            },
          },
        },
      });
    });
  }

  async removeAttachment(id: string) {
    // Get attachment to get Cloudinary public ID if stored
    const attachment = await this.prisma.memberLogAttachment.findUnique({
      where: { id },
    });

    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${id} not found`);
    }

    // Try to extract public ID from Cloudinary URL and delete from Cloudinary
    // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/{public_id}.{format}
    try {
      const urlParts = attachment.fileUrl.split('/upload/');
      if (urlParts.length > 1) {
        const publicIdWithFormat = urlParts[1].split('.')[0];
        await this.uploadService.deleteFile(publicIdWithFormat);
      }
    } catch (error) {
      console.error('Failed to delete file from Cloudinary:', error);
      // Continue with DB deletion even if Cloudinary deletion fails
    }

    // RLS ensures only creator/admin can delete attachments
    return this.prisma.withRLSContext(async (tx) => {
      return tx.memberLogAttachment.delete({
        where: { id },
      });
    });
  }
}

