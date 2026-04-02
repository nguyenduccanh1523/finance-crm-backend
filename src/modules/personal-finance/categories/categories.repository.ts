import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Category } from '../entities/category.entity';

@Injectable()
export class CategoriesRepository {
  constructor(
    @InjectRepository(Category)
    private readonly repo: Repository<Category>,
  ) {}

  async findGlobalCategories() {
    return this.repo.find({
      where: { workspaceId: IsNull() as any, deletedAt: IsNull() as any },
      order: { sortOrder: 'ASC' as any, createdAt: 'DESC' as any },
    });
  }

  async findWorkspaceCategories(workspaceId: string) {
    return this.repo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { sortOrder: 'ASC' as any, createdAt: 'DESC' as any },
    });
  }

  async findOne(query: any) {
    return this.repo.findOne({ where: query });
  }

  async findById(id: string, workspaceId: string) {
    // Find category that belongs to this workspace OR is global (workspaceId = null)
    return this.repo
      .createQueryBuilder('c')
      .where('c.id = :id', { id })
      .andWhere('c.deleted_at IS NULL')
      .andWhere('(c.workspace_id = :workspaceId OR c.workspace_id IS NULL)', {
        workspaceId,
      })
      .getOne();
  }

  async findByExcluding(
    workspaceId: string,
    name: string,
    icon: string,
    excludeId: string,
  ) {
    return this.repo.findOne({
      where: {
        workspaceId,
        name,
        icon,
        id: Not(excludeId),
        deletedAt: IsNull() as any,
      },
    });
  }

  async count(query: any) {
    return this.repo.count({ where: query });
  }

  create(data: any): Category {
    return this.repo.create(data) as any;
  }

  async save(entity: Category): Promise<Category> {
    return this.repo.save(entity);
  }

  async softDelete(id: string) {
    return this.repo.softDelete({ id });
  }
}
