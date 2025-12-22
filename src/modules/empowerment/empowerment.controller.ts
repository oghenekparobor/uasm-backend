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
import { EmpowermentService } from './empowerment.service';
import { CreateEmpowermentDto } from './dto/create-empowerment.dto';
import { ApproveEmpowermentDto } from './dto/approve-empowerment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class EmpowermentQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

@Controller('empowerment')
@UseGuards(JwtAuthGuard)
export class EmpowermentController {
  constructor(private readonly empowermentService: EmpowermentService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEmpowermentDto, @AuthUser() user: AuthenticatedUser) {
    return this.empowermentService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: EmpowermentQueryDto) {
    return this.empowermentService.findAll(query.memberId, query.status, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.empowermentService.findOne(id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveEmpowermentDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.empowermentService.approve(id, dto, user);
  }

  @Patch(':id/reject')
  @HttpCode(HttpStatus.OK)
  reject(
    @Param('id') id: string,
    @Body() dto: ApproveEmpowermentDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.empowermentService.reject(id, dto, user);
  }
}

