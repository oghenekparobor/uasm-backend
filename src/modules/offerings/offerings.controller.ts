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
import { OfferingsService } from './offerings.service';
import { CreateOfferingDto } from './dto/create-offering.dto';
import { UpdateOfferingDto } from './dto/update-offering.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsUUID, IsOptional } from 'class-validator';
import { BaseFilterDto } from '../../common/dto/filter.dto';

export class OfferingsQueryDto extends BaseFilterDto {
  @IsOptional()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsUUID()
  attendanceWindowId?: string;
}

@Controller('offerings')
@UseGuards(JwtAuthGuard)
export class OfferingsController {
  constructor(private readonly offeringsService: OfferingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOfferingDto, @AuthUser() user: AuthenticatedUser) {
    return this.offeringsService.create(dto, user);
  }

  @Get()
  findAll(@Query() query: OfferingsQueryDto) {
    return this.offeringsService.findAll(query.classId, query.attendanceWindowId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.offeringsService.findOne(id);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOfferingDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.offeringsService.update(id, dto, user);
  }
}

