import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { HandleRequestDto } from './dto/handle-request.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsOptional, IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';
import { BaseFilterDto } from '../../common/dto/filter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class RequestsQueryDto extends BaseFilterDto {
  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

@Controller('requests')
@UseGuards(JwtAuthGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRequestDto, @AuthUser() user: AuthenticatedUser) {
    return this.requestsService.create(dto, user);
  }

  @Get('my')
  findMyRequests(@Query() filters: RequestsQueryDto, @AuthUser() user: AuthenticatedUser) {
    return this.requestsService.findMyRequests(user.id, filters);
  }

  @Get()
  findAll(@Query() query: RequestsQueryDto) {
    return this.requestsService.findAll(query.status, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.requestsService.findOne(id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id') id: string,
    @Body() dto: HandleRequestDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.requestsService.handle(id, { ...dto, status: 'APPROVED' as any }, user);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @Body() dto: HandleRequestDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.requestsService.handle(id, { ...dto, status: 'REJECTED' as any }, user);
  }
}

