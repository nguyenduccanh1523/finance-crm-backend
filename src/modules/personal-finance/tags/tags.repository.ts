import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Tag } from '../entities/tag.entity';

@Injectable()
export class TagsRepository {
  constructor(
    @InjectRepository(Tag)
    private readonly repo: Repository<Tag>,
  ) {}

  async findGlobalTags() {
    return this.repo.find({
      where: { workspaceId: IsNull() as any, deletedAt: IsNull() as any },
      order: { createdAt: 'DESC' as any },
    });
  }

  async findWorkspaceTags(
    workspaceId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo.findAndCount({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { createdAt: 'DESC' as any },
      skip,
      take: limit,
    });
    return { items, total };
  }

  async findOne(query: any) {
    return this.repo.findOne({ where: query });
  }

  async findById(id: string, workspaceId: string) {
    // Find tag that belongs to this workspace OR is global (workspaceId = null)
    return this.repo
      .createQueryBuilder('t')
      .where('t.id = :id', { id })
      .andWhere('t.deleted_at IS NULL')
      .andWhere('(t.workspace_id = :workspaceId OR t.workspace_id IS NULL)', {
        workspaceId,
      })
      .getOne();
  }

  async findByExcluding(
    workspaceId: string,
    name: string,
    color: string,
    excludeId: string,
  ) {
    return this.repo.findOne({
      where: {
        workspaceId,
        name,
        color,
        id: Not(excludeId),
        deletedAt: IsNull() as any,
      },
    });
  }

  async count(query: any) {
    return this.repo.count({ where: query });
  }

  create(data: any): Tag {
    return this.repo.create(data) as any;
  }

  async save(entity: Tag): Promise<Tag> {
    return this.repo.save(entity);
  }

  async softDelete(id: string) {
    return this.repo.softDelete({ id });
  }
}
