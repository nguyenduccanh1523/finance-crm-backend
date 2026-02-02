import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { personalErrors } from '../common/personal.errors';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AdminCreateCategoryDto } from './dto/admin-create-category.dto';
import { CategoryKind } from '../../../common/enums/category-kind.enum';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category) private readonly repo: Repository<Category>,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { sortOrder: 'ASC' as any, createdAt: 'DESC' as any },
    });
  }

  async create(user: any, dto: CreateCategoryDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    const used = await this.repo.count({
      where: { workspaceId: ws.id, deletedAt: IsNull() as any },
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
    const cat = await this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!cat) throw personalErrors.resourceNotFound('category');

    if (dto.name !== undefined) cat.name = dto.name;
    if (dto.kind !== undefined) cat.kind = dto.kind;
    if (dto.parentId !== undefined) cat.parentId = dto.parentId;
    if (dto.icon !== undefined) cat.icon = dto.icon;
    if (dto.sortOrder !== undefined) cat.sortOrder = dto.sortOrder;

    return this.repo.save(cat);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const cat = await this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!cat) throw personalErrors.resourceNotFound('category');
    await this.repo.softDelete({ id });
    return { ok: true };
  }

  // ADMIN
  async adminCreate(userId: string, dto: AdminCreateCategoryDto) {
    const ws = await this.wsService.getOrCreateByUserId(userId);
    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name ?? 'Uncategorized',
      kind: (dto.kind ?? (CategoryKind.EXPENSE as any)) as any,
      parentId: dto.parentId,
      icon: dto.icon,
      sortOrder: dto.sortOrder ?? 0,
    });
    return this.repo.save(entity);
  }
}
