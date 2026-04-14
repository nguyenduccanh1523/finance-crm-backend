import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';

@Injectable()
export class BudgetsRepository {
  constructor(
    @InjectRepository(Budget)
    private readonly repo: Repository<Budget>,
  ) {}

  async list(workspaceId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo.findAndCount({
      where: { workspaceId },
      order: { periodMonth: 'DESC' as any },
      skip,
      take: limit,
    });
    return { items, total };
  }

  async findOne(query: any) {
    return this.repo.findOne({ where: query });
  }

  create(data: any): Budget {
    return this.repo.create(data) as any;
  }

  async save(entity: Budget): Promise<Budget> {
    return this.repo.save(entity);
  }

  async delete(query: any) {
    return this.repo.delete(query);
  }
}
