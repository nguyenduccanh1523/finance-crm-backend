import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Tag } from '../entities/tag.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { personalErrors } from '../common/personal.errors';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { AdminCreateTagDto } from './dto/admin-create-tag.dto';

@Injectable()
export class TagsService {
  constructor(
    @InjectRepository(Tag) private readonly repo: Repository<Tag>,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { createdAt: 'DESC' as any },
    });
  }

  async create(user: any, dto: CreateTagDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const used = await this.repo.count({
      where: { workspaceId: ws.id, deletedAt: IsNull() as any },
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
    const tag = await this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!tag) throw personalErrors.resourceNotFound('tag');

    if (dto.name !== undefined) tag.name = dto.name;
    if (dto.color !== undefined) tag.color = dto.color;

    return this.repo.save(tag);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const tag = await this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!tag) throw personalErrors.resourceNotFound('tag');
    await this.repo.softDelete({ id });
    return { ok: true };
  }

  // ADMIN
  async adminCreate(userId: string, dto: AdminCreateTagDto) {
    const ws = await this.wsService.getOrCreateByUserId(userId);
    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name ?? 'Tag',
      color: dto.color,
    });
    return this.repo.save(entity);
  }
}
