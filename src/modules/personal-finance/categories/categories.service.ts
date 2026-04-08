import { Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { CategoriesRepository } from './categories.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { personalErrors } from '../common/personal.errors';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminCreateCategoryDto } from './dto/admin-create-category-unified.dto';
import { CategoryKind } from '../../../common/enums/category-kind.enum';
import {
  ListCategoriesResponseDto,
  CategoryResponseDto,
} from './dto/list-categories-response.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly repo: CategoriesRepository,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any, page: number = 1, limit: number = 20): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const cleanLimit = Math.min(limit || 20, 100); // Max 100 per page

    // Get global categories (workspaceId is null) - no pagination
    const globalCategories = await this.repo.findGlobalCategories();

    // Get workspace categories with pagination
    const { items: workspaceCategories, total } =
      await this.repo.findWorkspaceCategories(workspaceId, page, cleanLimit);

    // Format response
    const formatCategory = (cat: any, scope: 'global' | 'workspace'): any => ({
      id: cat.id,
      workspaceId: cat.workspaceId,
      name: cat.name,
      kind: cat.kind,
      icon: cat.icon,
      parentId: cat.parentId,
      sortOrder: cat.sortOrder,
      scope,
      createdAt: cat.createdAt,
      updatedAt: cat.updatedAt,
    });

    return {
      statusCode: 200,
      message: 'Success',
      data: {
        global: globalCategories.map((cat) => formatCategory(cat, 'global')),
        workspace: workspaceCategories.map((cat) =>
          formatCategory(cat, 'workspace'),
        ),
      },
      pagination: {
        page,
        limit: cleanLimit,
        total,
        totalPages: Math.ceil(total / cleanLimit),
      },
    };
  }

  async create(user: any, dto: CreateCategoryDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    // Check for duplicate name + icon combination
    if (dto.name && dto.icon) {
      const duplicate = await this.repo.findOne({
        workspaceId: ws.id,
        name: dto.name,
        icon: dto.icon,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Category with same name and icon already exists',
        );
      }
    }

    const used = await this.repo.count({
      workspaceId: ws.id,
      deletedAt: IsNull() as any,
    });
    await this.policy.assertQuota(user, PersonalQuotaKeys.CATEGORIES_MAX, used);

    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name,
      kind: dto.kind,
      parentId: dto.parentId,
      icon: dto.icon,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateCategoryDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const cat = await this.repo.findById(id, workspaceId);
    if (!cat) throw personalErrors.resourceNotFound('category');

    // Check for duplicate name + icon combination (excluding current category)
    const newName = dto.name !== undefined ? dto.name : cat.name;
    const newIcon = dto.icon !== undefined ? dto.icon : cat.icon;
    if (newName && newIcon) {
      const duplicate = await this.repo.findByExcluding(
        workspaceId,
        newName,
        newIcon,
        id,
      );
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Category with same name and icon already exists',
        );
      }
    }

    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.kind !== undefined) cat.kind = dto.kind;
    if (dto.parentId !== undefined) cat.parentId = dto.parentId;
    if (dto.icon !== undefined) cat.icon = dto.icon;
    if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;

    return this.repo.save(cat);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const cat = await this.repo.findById(id, workspaceId);
    if (!cat) throw personalErrors.resourceNotFound('category');
    await this.repo.softDelete(id);
    return { ok: true };
  }

  // ADMIN - Unified endpoint
  async adminCreate(dto: AdminCreateCategoryDto) {
    const defaultKind = CategoryKind.EXPENSE as any;

    // Route by scope
    if (dto.scope === 'global') {
      return this.createGlobalCategory(dto, defaultKind);
    }

    if (dto.scope === 'workspace') {
      if (!dto.workspaceId) {
        throw personalErrors.invalidInput(
          'workspaceId required for workspace scope',
        );
      }
      return this.createWorkspaceCategory(dto.workspaceId, dto, defaultKind);
    }

    if (dto.scope === 'user') {
      if (!dto.userId) {
        throw personalErrors.invalidInput('userId required for user scope');
      }
      return this.createUserCategory(dto.userId, dto, defaultKind);
    }

    throw personalErrors.invalidInput('Invalid scope');
  }

  private async createGlobalCategory(
    dto: AdminCreateCategoryDto,
    defaultKind: any,
  ) {
    // Check for duplicate name + icon combination in global scope
    if (dto.name && dto.icon) {
      const duplicate = await this.repo.findOne({
        workspaceId: IsNull() as any,
        name: dto.name,
        icon: dto.icon,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Global category with same name and icon already exists',
        );
      }
    }

    const entity = this.repo.create({
      workspaceId: null,
      name: dto.name,
      kind: dto.kind ?? defaultKind,
      parentId: dto.parentId,
      icon: dto.icon,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(entity);
  }

  private async createWorkspaceCategory(
    workspaceId: string,
    dto: AdminCreateCategoryDto,
    defaultKind: any,
  ) {
    // Check for duplicate name + icon combination in workspace scope
    if (dto.name && dto.icon) {
      const duplicate = await this.repo.findOne({
        workspaceId,
        name: dto.name,
        icon: dto.icon,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Workspace category with same name and icon already exists',
        );
      }
    }

    const entity = this.repo.create({
      workspaceId,
      name: dto.name,
      kind: dto.kind ?? defaultKind,
      parentId: dto.parentId,
      icon: dto.icon,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(entity);
  }

  private async createUserCategory(
    userId: string,
    dto: AdminCreateCategoryDto,
    defaultKind: any,
  ) {
    const ws = await this.wsService.getOrCreateByUserId(userId);

    // Check for duplicate name + icon combination in user workspace
    if (dto.name && dto.icon) {
      const duplicate = await this.repo.findOne({
        workspaceId: ws.id,
        name: dto.name,
        icon: dto.icon,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Category with same name and icon already exists in user workspace',
        );
      }
    }

    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name ?? 'Uncategorized',
      kind: dto.kind ?? defaultKind,
      parentId: dto.parentId,
      icon: dto.icon,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(entity);
  }
}
