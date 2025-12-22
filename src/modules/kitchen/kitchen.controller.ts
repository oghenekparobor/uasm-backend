import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { KitchenService } from './kitchen.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { LogProductionDto } from './dto/log-production.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthUser } from '../auth/auth-user.decorator';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { IsUUID, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ProductionQueryDto extends PaginationDto {
  @IsOptional()
  @IsUUID()
  recipeId?: string;
}

@Controller('kitchen')
@UseGuards(JwtAuthGuard)
export class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Post('recipes')
  @HttpCode(HttpStatus.CREATED)
  createRecipe(@Body() dto: CreateRecipeDto) {
    return this.kitchenService.createRecipe(dto);
  }

  @Get('recipes')
  findAllRecipes(@Query() pagination: PaginationDto) {
    return this.kitchenService.findAllRecipes(pagination);
  }

  @Get('recipes/:id')
  findOneRecipe(@Param('id') id: string) {
    return this.kitchenService.findOneRecipe(id);
  }

  @Post('production')
  @HttpCode(HttpStatus.CREATED)
  logProduction(@Body() dto: LogProductionDto, @AuthUser() user: AuthenticatedUser) {
    return this.kitchenService.logProduction(dto, user);
  }

  @Get('production')
  findAllProduction(@Query() query: ProductionQueryDto) {
    return this.kitchenService.findAllProductionLogs(query.recipeId, query);
  }
}

