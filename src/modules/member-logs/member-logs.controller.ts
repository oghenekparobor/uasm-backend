import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MemberLogsService } from './member-logs.service';
import { CreateMemberLogDto } from './dto/create-member-log.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsUUID, IsOptional, IsString, IsNotEmpty } from 'class-validator';
import { FileUploadInterceptor } from '../upload/file-upload.interceptor';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class MemberLogsQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

export class UpdateMemberLogDto {
  @IsString()
  @IsNotEmpty()
  note: string;
}

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MemberLogsController {
  constructor(private readonly memberLogsService: MemberLogsService) {}

  @Post(':id/logs')
  @HttpCode(HttpStatus.CREATED)
  create(
    @Param('id') memberId: string,
    @Body() dto: Omit<CreateMemberLogDto, 'memberId'>,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.memberLogsService.create({ ...dto, memberId }, user);
  }

  @Get(':id/logs')
  findAll(@Param('id') memberId: string, @Query() pagination: PaginationDto) {
    return this.memberLogsService.findAll(memberId, pagination);
  }
}

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly memberLogsService: MemberLogsService) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.memberLogsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMemberLogDto) {
    return this.memberLogsService.update(id, dto.note);
  }

  @Post(':id/attachments')
  @Throttle({ default: { limit: 20, ttl: 60000 } }) // 20 uploads per minute
  @UseInterceptors(
    FileUploadInterceptor({
      fieldName: 'file',
      maxSize: 10 * 1024 * 1024, // 10MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
      ],
      required: true,
    }),
  )
  @HttpCode(HttpStatus.CREATED)
  async addAttachment(
    @Param('id') logId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.memberLogsService.addAttachmentFromUpload(logId, file);
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAttachment(@Param('id') id: string) {
    return this.memberLogsService.removeAttachment(id);
  }
}

