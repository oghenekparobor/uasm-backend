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
} from '@nestjs/common';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { TransferMemberDto } from './dto/transfer-member.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { MemberFilterDto } from './dto/member-filter.dto';

@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createMemberDto: CreateMemberDto, @AuthUser() user: AuthenticatedUser) {
    return this.membersService.create(createMemberDto, user);
  }

  @Get()
  findAll(@Query() filters: MemberFilterDto) {
    return this.membersService.findAll(filters);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMemberDto: UpdateMemberDto) {
    return this.membersService.update(id, updateMemberDto);
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
}

