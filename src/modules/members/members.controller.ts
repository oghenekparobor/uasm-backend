import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TransferMemberDto } from './dto/transfer-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { MemberFilterDto } from './dto/member-filter.dto';
import { FileUploadInterceptor } from '../upload/file-upload.interceptor';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMemberDto: CreateMemberDto, @AuthUser() user: AuthenticatedUser) {
    return this.membersService.create(createMemberDto, user);
  }

  @Post('upload-csv')
  @UseInterceptors(
    FileUploadInterceptor({
      fieldName: 'file',
      maxSize: 10 * 1024 * 1024,
      allowedMimeTypes: ['text/csv', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
      required: true,
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadCsv(
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.importFromCsv(file.buffer, user);
  }

  @Get()
  findAll(@Query() filters: MemberFilterDto, @AuthUser() user: AuthenticatedUser) {
    return this.membersService.findAll(filters, user);
  }

  @Get('birthdays/upcoming')
  getUpcomingBirthdays(
    @Query('upcomingDays', new DefaultValuePipe(7), new ParseIntPipe({ optional: true }))
    upcomingDays: number,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.getUpcomingBirthdays(upcomingDays, user);
  }

  @Get('birthdays/past')
  getPastBirthdays(
    @Query('pastDays', new DefaultValuePipe(7), new ParseIntPipe({ optional: true }))
    pastDays: number,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.getPastBirthdays(pastDays, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMemberDto: UpdateMemberDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.update(id, updateMemberDto, user);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  transfer(
    @Param('id') id: string,
    @Body() transferDto: TransferMemberDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.transfer(id, transferDto, user);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.membersService.getHistory(id);
  }

  @Post(':id/photo')
  @UseInterceptors(
    FileUploadInterceptor({
      fieldName: 'photo',
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
      required: true,
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadPhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.uploadPhoto(id, file, user);
  }

  @Post(':id/photo/remove')
  @HttpCode(HttpStatus.OK)
  async removePhoto(
    @Param('id') id: string,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.membersService.removePhoto(id, user);
  }
}

