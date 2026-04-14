import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Goal } from '../entities/goal.entity';

@Injectable()
export class GoalsRepository {
  constructor(
    @InjectRepository(Goal)
    private readonly repo: Repository<Goal>,
  ) {}

  async list(workspaceId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo.findAndCount({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { createdAt: 'DESC' as any },
      skip,
      take: limit,
    });
    return { items, total };
  }

  async findOne(id: string, workspaceId: string) {
    return this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
  }

  create(data: any): Goal {
    return this.repo.create(data) as any;
  }

  async save(entity: Goal): Promise<Goal> {
    return this.repo.save(entity);
  }

  async softDelete(id: string) {
    return this.repo.softDelete({ id });
  }
}
