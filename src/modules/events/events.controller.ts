import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsBoolean, IsNotEmpty } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class RecordAttendanceDto {
  @IsBoolean()
  @IsNotEmpty()
  attended: boolean;
}

@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateEventDto, @AuthUser() user: AuthenticatedUser) {
    return this.eventsService.create(dto, user);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.eventsService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(@Param('id') id: string) {
    return this.eventsService.approve(id);
  }

  @Post(':id/attendance')
  @HttpCode(HttpStatus.CREATED)
  recordAttendance(
    @Param('id') eventId: string,
    @Body() dto: { memberId: string; attended: boolean },
  ) {
    return this.eventsService.recordAttendance(eventId, dto.memberId, dto.attended);
  }

  @Get(':id/attendance')
  getAttendance(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }
}

