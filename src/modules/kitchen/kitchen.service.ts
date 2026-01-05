import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { LogProductionDto } from './dto/log-production.dto';
import { AuthenticatedUser } from '../../common/types/auth-user.type';
import { PaginationDto, getPaginationParams, createPaginationMeta, PaginatedResponse } from '../../common/dto/pagination.dto';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';

@Injectable({ scope: Scope.REQUEST })
export class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  async createRecipe(dto: CreateRecipeDto) {
    // RLS ensures only kitchen/admin can create recipes
    // Get user from request for RLS context
    const user = (this.request as any).user as AuthenticatedUser | undefined;
    return this.prisma.withRLSContext(user, async (tx) => {
      return tx.kitchenRecipe.create({
        data: {
          name: dto.name,
          description: dto.description,
          ingredients: dto.ingredients,
          instructions: dto.instructions,
          portionSizes: dto.portionSizes,
          nutritionalInfo: dto.nutritionalInfo,
          category: dto.category,
        },
      });
    });
  }

  async findAllRecipes(pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.kitchenRecipe.count();

    // RLS filters based on role
    const data = await this.prisma.kitchenRecipe.findMany({
      skip,
      take,
      orderBy: {
        name: 'asc',
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOneRecipe(id: string) {
    const recipe = await this.prisma.kitchenRecipe.findUnique({
      where: { id },
      include: {
        productionLogs: {
          orderBy: {
            weekDate: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${id} not found`);
    }

    return recipe;
  }

  async logProduction(dto: LogProductionDto, user: AuthenticatedUser) {
    // Verify recipe exists
    const recipe = await this.prisma.kitchenRecipe.findUnique({
      where: { id: dto.recipeId },
    });

    if (!recipe) {
      throw new NotFoundException(`Recipe with ID ${dto.recipeId} not found`);
    }

    // RLS ensures only kitchen/admin can create production logs
    return this.prisma.kitchenProductionLog.create({
      data: {
        recipeId: dto.recipeId,
        quantity: dto.quantity,
        weekDate: new Date(dto.weekDate),
        loggedBy: user.id,
      },
      include: {
        recipe: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAllProductionLogs(recipeId?: string, pagination?: PaginationDto): Promise<PaginatedResponse<any>> {
    const { skip, take, page, limit } = getPaginationParams(pagination || {});

    // Get total count for pagination metadata
    const total = await this.prisma.kitchenProductionLog.count({
      where: {
        ...(recipeId && { recipeId }),
      },
    });

    // RLS filters: kitchen sees own logs, admin/distribution see all
    const data = await this.prisma.kitchenProductionLog.findMany({
      skip,
      take,
      where: {
        ...(recipeId && { recipeId }),
      },
      include: {
        recipe: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        weekDate: 'desc',
      },
    });

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }
}

