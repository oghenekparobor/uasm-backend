import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, InternalServerErrorException } from '@nestjs/common';
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
import { UploadService } from '../upload/upload.service';
import { Express } from 'express';
import { parse } from 'csv-parse/sync';
import { ClassType } from '@prisma/client';

const WORKERS_CLASS_ID = '00000000-0000-0000-0000-00000000WORK';

function normalizeHeader(h: string): string {
  return (h || '').trim();
}

function getRowValue(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function parseCsvDate(value: string): Date | null {
  const s = (value || '').trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogs: ActivityLogsService,
    private readonly uploadService: UploadService,
  ) {}

  async create(dto: CreateMemberDto, user: AuthenticatedUser) {
    // RLS will enforce that user can only create members in their platoons
    return this.prisma.withRLSContext(user, async (tx) => {
      return tx.member.create({
        data: {
          firstName: dto.firstName,
          lastName: dto.lastName,
          birthday: dto.birthday ? new Date(dto.birthday) : null,
          phone: dto.phone ?? null,
          email: dto.email ?? null,
          address: dto.address,
          emergencyContact: dto.emergencyContact,
          occupation: dto.occupation ?? null,
          status: dto.status ?? null,
          age: dto.age ?? null,
          gender: dto.gender ?? null,
          currentClassId: dto.currentClassId,
        },
      });
    });
  }

  async findAll(filters: MemberFilterDto, user?: AuthenticatedUser): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(filters);

    // Build where clause
    const where: any = {};

    // If user is not admin/super_admin, filter to only show members from classes they're assigned to
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      // Get class IDs where user is assigned as a leader
      const userClassLeaders = await this.prisma.classLeader.findMany({
        where: {
          userId: user.id,
        },
        select: {
          classId: true,
        },
      });

      const userClassIds = userClassLeaders.map((cl) => cl.classId);

      if (userClassIds.length > 0) {
        // If user has assigned classes, filter members by those classes
        // If currentClassIds is already set in filters, intersect with user's classes
        if (filters.currentClassIds && filters.currentClassIds.length > 0) {
          const intersection = filters.currentClassIds.filter((id) => userClassIds.includes(id));
          where.currentClassId = intersection.length > 0 ? { in: intersection } : { in: [] };
        } else if (filters.currentClassId) {
          // If single class ID is set, check if user has access to it
          if (userClassIds.includes(filters.currentClassId)) {
            where.currentClassId = filters.currentClassId;
          } else {
            // User doesn't have access to this class, return empty result
            where.currentClassId = { in: [] };
          }
        } else {
          // No class filter specified, show all members from user's classes
          where.currentClassId = {
            in: userClassIds,
          };
        }
      } else {
        // User has no assigned classes, return empty result
        where.currentClassId = { in: [] };
      }
    } else {
      // Admin/super_admin: apply class filters if specified
      if (filters.currentClassId) {
        where.currentClassId = filters.currentClassId;
      }

      // Multiple class IDs filter
      if (filters.currentClassIds && filters.currentClassIds.length > 0) {
        where.currentClassId = {
          in: filters.currentClassIds,
        };
      }
    }

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

    // Birthday date range filter
    const birthdayFilter = buildDateRangeFilter(filters.birthdayFrom, filters.birthdayTo, 'birthday');
    if (birthdayFilter) {
      Object.assign(where, birthdayFilter);
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

  async update(id: string, dto: UpdateMemberDto, user: AuthenticatedUser) {
    // RLS ensures user can only update members in their platoons
    return this.prisma.withRLSContext(user, async (tx) => {
      const updateData: any = {};
      
      if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
      if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
      if (dto.birthday !== undefined) updateData.birthday = dto.birthday ? new Date(dto.birthday) : null;
      if (dto.phone !== undefined) updateData.phone = dto.phone || null;
      if (dto.email !== undefined) updateData.email = dto.email || null;
      if (dto.address !== undefined) updateData.address = dto.address || null;
      if (dto.emergencyContact !== undefined) updateData.emergencyContact = dto.emergencyContact || null;
      if (dto.occupation !== undefined) updateData.occupation = dto.occupation || null;
      if (dto.status !== undefined) updateData.status = dto.status || null;
      if (dto.age !== undefined) updateData.age = dto.age ?? null;
      if (dto.gender !== undefined) updateData.gender = dto.gender || null;
      if (dto.currentClassId !== undefined) updateData.currentClassId = dto.currentClassId;

      return tx.member.update({
        where: { id },
        data: updateData,
      });
    });
  }

  async transfer(id: string, dto: TransferMemberDto, user: AuthenticatedUser) {
    // RLS ensures only admin/super_admin can transfer members
    return this.prisma.withRLSContext(user, async (tx) => {
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

  async getUpcomingBirthdays(upcomingDays: number = 7, user?: AuthenticatedUser) {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    const todayYear = today.getFullYear();

    // Build base where clause
    const where: any = {
      birthday: {
        not: null,
      },
    };

    // Apply RLS: If user is not admin/super_admin, filter to only show members from classes they're assigned to
    if (user && user.role !== 'admin' && user.role !== 'super_admin') {
      const userClassLeaders = await this.prisma.classLeader.findMany({
        where: {
          userId: user.id,
        },
        select: {
          classId: true,
        },
      });

      const userClassIds = userClassLeaders.map((cl) => cl.classId);

      if (userClassIds.length > 0) {
        where.currentClassId = {
          in: userClassIds,
        };
      } else {
        // User has no assigned classes, return empty array
        return [];
      }
    }

    // Get all members with birthdays (using RLS context)
    const members = user
      ? await this.prisma.withRLSContext(user, async (tx) => {
          return tx.member.findMany({
            where,
            include: {
              currentClass: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
            },
          });
        })
      : await this.prisma.member.findMany({
          where,
          include: {
            currentClass: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        });

    // Filter members whose birthdays fall within the upcoming days
    const upcomingBirthdays = members
      .map((member) => {
        if (!member.birthday) return null;

        const birthday = new Date(member.birthday);
        const birthdayMonth = birthday.getMonth();
        const birthdayDate = birthday.getDate();

        // Create this year's birthday date
        const thisYearBirthday = new Date(todayYear, birthdayMonth, birthdayDate);

        // If this year's birthday has already passed, use next year's birthday
        const nextBirthday =
          thisYearBirthday < today
            ? new Date(todayYear + 1, birthdayMonth, birthdayDate)
            : thisYearBirthday;

        // Calculate days until birthday
        const daysUntil = Math.ceil(
          (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntil >= 0 && daysUntil <= upcomingDays) {
          return {
            ...member,
            daysUntil,
            nextBirthday: nextBirthday.toISOString(),
          };
        }

        return null;
      })
      .filter((member): member is NonNullable<typeof member> => member !== null)
      .sort((a, b) => a.daysUntil - b.daysUntil);

    return upcomingBirthdays;
  }

  async uploadPhoto(id: string, file: Express.Multer.File, user: AuthenticatedUser) {
    // Verify member exists first (before upload to avoid unnecessary uploads)
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: { id: true, photoUrl: true },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    // Delete old photo if exists
    if (member.photoUrl) {
      try {
        // Extract public ID from Cloudinary URL
        const urlParts = member.photoUrl.split('/upload/');
        if (urlParts.length > 1) {
          const publicIdWithFormat = urlParts[1].split('.')[0];
          await this.uploadService.deleteFile(publicIdWithFormat);
        }
      } catch (error) {
        console.error('Failed to delete old photo from Cloudinary:', error);
        // Continue with new upload even if old photo deletion fails
      }
    }

    // Upload new photo to Cloudinary
    const uploadResult = await this.uploadService.uploadFile(
      file,
      `uams/members/${id}`,
    );

    // Update member with new photo URL (with RLS context)
    return this.prisma.withRLSContext(user, async (tx) => {
      return tx.member.update({
        where: { id },
        data: {
          photoUrl: uploadResult.secureUrl,
        },
      });
    });
  }

  async removePhoto(id: string, user: AuthenticatedUser) {
    // Get member to check if photo exists
    const member = await this.prisma.member.findUnique({
      where: { id },
      select: { id: true, photoUrl: true },
    });

    if (!member) {
      throw new NotFoundException(`Member with ID ${id} not found`);
    }

    if (!member.photoUrl) {
      return member; // No photo to remove
    }

    // Delete photo from Cloudinary
    try {
      const urlParts = member.photoUrl.split('/upload/');
      if (urlParts.length > 1) {
        const publicIdWithFormat = urlParts[1].split('.')[0];
        await this.uploadService.deleteFile(publicIdWithFormat);
      }
    } catch (error) {
      console.error('Failed to delete photo from Cloudinary:', error);
      // Continue with DB update even if Cloudinary deletion fails
    }

    // Update member to remove photo URL (with RLS context)
    return this.prisma.withRLSContext(user, async (tx) => {
      return tx.member.update({
        where: { id },
        data: {
          photoUrl: null,
        },
      });
    });
  }

  /**
   * Import members from CSV. Only admin and super_admin can use this.
   * Required per row: First name, Last name, Platoon (others are optional; missing values are set to null).
   * Uses in-memory class cache (load all platoon classes once) and creates classes by name if missing.
   * Maps: next of kin -> emergency_contact; nearest bus stop appended to address.
   */
  async importFromCsv(
    buffer: Buffer,
    user: AuthenticatedUser,
  ): Promise<{ created: number; errors: { row: number; message: string }[] }> {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new ForbiddenException('Only administrators can import members from CSV.');
    }

    let rows: Record<string, string>[];
    try {
      const raw = buffer.toString('utf-8').replace(/^\uFEFF/, '');
      const parsed = parse(raw, {
        columns: (headers) => headers.map(normalizeHeader),
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      });
      rows = parsed as Record<string, string>[];
    } catch (e) {
      throw new BadRequestException('Invalid CSV format.');
    }

    if (rows.length === 0) {
      return { created: 0, errors: [] };
    }

    const errors: { row: number; message: string }[] = [];

    try {
      return await this.prisma.withRLSContext(user, async (tx) => {
        const classCache = new Map<string, string>();
        const allClasses = await tx.class.findMany({
          where: {
            type: ClassType.PLATOON,
            id: { not: WORKERS_CLASS_ID },
          },
          select: { id: true, name: true },
        });
        allClasses.forEach((c) => classCache.set(c.name.trim(), c.id));

        async function getOrCreateClassId(platoonName: string): Promise<string | null> {
          const name = (platoonName || '').trim();
          if (!name) return null;
          let id = classCache.get(name);
          if (id) return id;
          const created = await tx.class.create({
            data: { name, type: ClassType.PLATOON },
            select: { id: true },
          });
          classCache.set(name, created.id);
          return created.id;
        }

        let created = 0;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const rowNum = i + 2;
          const firstName = getRowValue(row, 'First Name', 'First name');
          const lastName = getRowValue(row, 'Last Name', 'Lastname', 'Last name');
          const platoon = getRowValue(row, 'Platoon');
          if (!firstName || !lastName || !platoon) {
            errors.push({
              row: rowNum,
              message: 'Skipped: missing required First name, Last name, or Platoon.',
            });
            continue;
          }
          let classId: string | null = null;
          try {
            classId = await getOrCreateClassId(platoon);
          } catch (err: any) {
            errors.push({ row: rowNum, message: `Platoon "${platoon}": ${err?.message ?? 'Failed to get or create class.'}` });
            continue;
          }
          if (!classId) {
            errors.push({ row: rowNum, message: 'Skipped: Platoon name is empty.' });
            continue;
          }
          const dob = getRowValue(row, 'Date of Birth');
          const birthday = dob ? parseCsvDate(dob) : null;
          const address = getRowValue(row, 'Address');
          const nearestBusStop = getRowValue(row, 'Nearest Bus-stop', 'Nearest Bus-stop');
          const addressWithBusStop =
            address && nearestBusStop
              ? `${address}, Nearest bus stop: ${nearestBusStop}`
              : address || null;
          const phone = getRowValue(row, 'Phone Number', 'Phone number') || null;
          const gender = getRowValue(row, 'Gender') || null;
          const nextOfKin = getRowValue(row, 'Next of Kin (Name and Contact)', 'Next of Kin (Name and Contact)') || null;
          const occupation = getRowValue(row, 'Occupation') || null;
          const status = getRowValue(row, 'Marital Status') || null;
          const ageStr = getRowValue(row, 'Age');
          const age = ageStr ? parseInt(ageStr, 10) : null;
          const validAge = age != null && !isNaN(age) && age >= 0 && age <= 150 ? age : null;

          try {
            await tx.member.create({
              data: {
                firstName,
                lastName,
                birthday: birthday ?? null,
                phone,
                email: null,
                address: addressWithBusStop,
                emergencyContact: nextOfKin,
                occupation,
                status,
                age: validAge,
                gender,
                currentClassId: classId,
              },
            });
            created++;
          } catch (err) {
            errors.push({ row: rowNum, message: err?.message || 'Failed to create member.' });
          }
        }
      return { created, errors };
    });
    } catch (err: any) {
      this.logger.error(`CSV import failed: ${err?.message || err}`, err?.stack);
      throw new InternalServerErrorException(
        err?.message?.includes('row-level security') || err?.message?.includes('RLS')
          ? 'Permission denied. Ensure your account can create classes and members.'
          : `CSV import failed: ${err?.message || 'See server logs.'}`,
      );
    }
  }
}

