import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { AssignLeaderDto } from './dto/assign-leader.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('classes')
@UseGuards(JwtAuthGuard)
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.classesService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Post(':id/leaders')
  @HttpCode(HttpStatus.CREATED)
  assignLeader(@Param('id') id: string, @Body() dto: AssignLeaderDto) {
    return this.classesService.assignLeader(id, dto);
  }

  @Delete(':id/leaders/:userId/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLeader(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Param('role') role: string,
  ) {
    return this.classesService.removeLeader(id, userId, role);
  }
}

