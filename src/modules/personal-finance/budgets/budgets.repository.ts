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

  async list(workspaceId: string) {
    return this.repo.find({
      where: { workspaceId },
      order: { periodMonth: 'DESC' as any },
    });
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
