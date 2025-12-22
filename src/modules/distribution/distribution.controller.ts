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
import { DistributionService } from './distribution.service';
import { ConfirmReceiptDto } from './dto/confirm-receipt.dto';
import { AllocateFoodDto } from './dto/allocate-food.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsUUID, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class DistributionQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  batchId?: string;

  @IsOptional()
  @IsUUID()
  classId?: string;
}

@Controller('distribution')
@UseGuards(JwtAuthGuard)
export class DistributionController {
  constructor(private readonly distributionService: DistributionService) {}

  @Post('batches')
  @HttpCode(HttpStatus.CREATED)
  confirmReceipt(@Body() dto: ConfirmReceiptDto, @AuthUser() user: AuthenticatedUser) {
    return this.distributionService.confirmReceipt(dto, user);
  }

  @Get('batches')
  findAllBatches(@Query() pagination: PaginationDto) {
    return this.distributionService.findAllBatches(pagination);
  }

  @Get('batches/current')
  findCurrentBatch() {
    return this.distributionService.findCurrentBatch();
  }

  @Get('batches/:id')
  findOneBatch(@Param('id') id: string) {
    return this.distributionService.findOneBatch(id);
  }

  @Post('batches/:batchId/classes/:classId')
  @HttpCode(HttpStatus.CREATED)
  allocateFood(
    @Param('batchId') batchId: string,
    @Param('classId') classId: string,
    @Body() dto: Omit<AllocateFoodDto, 'distributionBatchId' | 'classId'>,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.distributionService.allocateFood(
      { ...dto, distributionBatchId: batchId, classId },
      user,
    );
  }

  @Get('allocations')
  findAllAllocations(@Query() query: DistributionQueryDto) {
    return this.distributionService.findAllAllocations(query.batchId, query.classId, query);
  }

  @Patch('allocations/:id')
  updateAllocation(@Param('id') id: string, @Body() dto: Partial<AllocateFoodDto>) {
    return this.distributionService.updateAllocation(id, dto);
  }

  @Get('overview')
  getOverview(@Query('batchId') batchId?: string) {
    return this.distributionService.getOverview(batchId);
  }
}

