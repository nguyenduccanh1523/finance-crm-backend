import { Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { TagsRepository } from './tags.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { personalErrors } from '../common/personal.errors';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AdminCreateTagDto } from './dto/admin-create-tag-unified.dto';
import {
  ListTagsResponseDto,
  TagResponseDto,
} from './dto/list-tags-response.dto';

@Injectable()
export class TagsService {
  constructor(
    private readonly repo: TagsRepository,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any, page: number = 1, limit: number = 20): Promise<any> {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const cleanLimit = Math.min(limit || 20, 100); // Max 100 per page

    // Get global tags (workspaceId is null) - no pagination
    const globalTags = await this.repo.findGlobalTags();

    // Get workspace tags with pagination
    const { items: workspaceTags, total } = await this.repo.findWorkspaceTags(
      workspaceId,
      page,
      cleanLimit,
    );

    // Format response
    const formatTag = (tag: any, scope: 'global' | 'workspace'): any => ({
      id: tag.id,
      workspaceId: tag.workspaceId,
      name: tag.name,
      color: tag.color,
      scope,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    });

    return {
      statusCode: 200,
      message: 'Success',
      data: {
        global: globalTags.map((tag) => formatTag(tag, 'global')),
        workspace: workspaceTags.map((tag) => formatTag(tag, 'workspace')),
      },
      pagination: {
        page,
        limit: cleanLimit,
        total,
        totalPages: Math.ceil(total / cleanLimit),
      },
    };
  }

  async create(user: any, dto: CreateTagDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    // Check for duplicate name + color combination
    if (dto.name && dto.color) {
      const duplicate = await this.repo.findOne({
        workspaceId: ws.id,
        name: dto.name,
        color: dto.color,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Tag with same name and color already exists',
        );
      }
    }

    const used = await this.repo.count({
      workspaceId: ws.id,
      deletedAt: IsNull() as any,
    });
    await this.policy.assertQuota(user, PersonalQuotaKeys.TAGS_MAX, used);

    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name,
      color: dto.color,
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateTagDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const tag = await this.repo.findById(id, workspaceId);
    if (!tag) throw personalErrors.resourceNotFound('tag');

    // Check for duplicate name + color combination (excluding current tag)
    const newName = dto.name !== undefined ? dto.name : tag.name;
    const newColor = dto.color !== undefined ? dto.color : tag.color;
    if (newName && newColor) {
      const duplicate = await this.repo.findByExcluding(
        workspaceId,
        newName,
        newColor,
        id,
      );
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Tag with same name and color already exists',
        );
      }
    }

    if (dto.name !== undefined) tag.name = dto.name;
    if (dto.color !== undefined) tag.color = dto.color;

    return this.repo.save(tag);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const tag = await this.repo.findById(id, workspaceId);
    if (!tag) throw personalErrors.resourceNotFound('tag');
    await this.repo.softDelete(id);
    return { ok: true };
  }

  // ADMIN - Unified endpoint
  async adminCreate(dto: AdminCreateTagDto) {
    // Route by scope
    if (dto.scope === 'global') {
      return this.createGlobalTag(dto);
    }

    if (dto.scope === 'workspace') {
      if (!dto.workspaceId) {
        throw personalErrors.invalidInput(
          'workspaceId required for workspace scope',
        );
      }
      return this.createWorkspaceTag(dto.workspaceId, dto);
    }

    if (dto.scope === 'user') {
      if (!dto.userId) {
        throw personalErrors.invalidInput('userId required for user scope');
      }
      return this.createUserTag(dto.userId, dto);
    }

    throw personalErrors.invalidInput('Invalid scope');
  }

  private async createGlobalTag(dto: AdminCreateTagDto) {
    // Check for duplicate name + color combination in global scope
    if (dto.name && dto.color) {
      const duplicate = await this.repo.findOne({
        workspaceId: IsNull() as any,
        name: dto.name,
        color: dto.color,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Global tag with same name and color already exists',
        );
      }
    }

    const entity = this.repo.create({
      workspaceId: null,
      name: dto.name,
      color: dto.color,
    });
    return this.repo.save(entity);
  }

  private async createWorkspaceTag(
    workspaceId: string,
    dto: AdminCreateTagDto,
  ) {
    // Check for duplicate name + color combination in workspace scope
    if (dto.name && dto.color) {
      const duplicate = await this.repo.findOne({
        workspaceId,
        name: dto.name,
        color: dto.color,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Workspace tag with same name and color already exists',
        );
      }
    }

    const entity = this.repo.create({
      workspaceId,
      name: dto.name,
      color: dto.color,
    });
    return this.repo.save(entity);
  }

  private async createUserTag(userId: string, dto: AdminCreateTagDto) {
    const ws = await this.wsService.getOrCreateByUserId(userId);

    // Check for duplicate name + color combination in user workspace
    if (dto.name && dto.color) {
      const duplicate = await this.repo.findOne({
        workspaceId: ws.id,
        name: dto.name,
        color: dto.color,
        deletedAt: IsNull() as any,
      });
      if (duplicate) {
        throw personalErrors.invalidInput(
          'Tag with same name and color already exists in user workspace',
        );
      }
    }

    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name ?? 'Tag',
      color: dto.color,
    });
    return this.repo.save(entity);
  }
}
