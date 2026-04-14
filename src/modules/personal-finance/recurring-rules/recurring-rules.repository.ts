import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { RecurringRule } from '../entities/recurring-rule.entity';
import { Account } from '../entities/account.entity';
import { Category } from '../entities/category.entity';

@Injectable()
export class RecurringRulesRepository {
  constructor(
    @InjectRepository(RecurringRule)
    private readonly repo: Repository<RecurringRule>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async list(workspaceId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.repo.findAndCount({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { nextRunAt: 'ASC' as any },
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

  async findById(id: string) {
    return this.repo.findOne({ where: { id, deletedAt: IsNull() as any } });
  }

  async findByIdWithoutDeleted(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  async count(query: any) {
    return this.repo.count({ where: query });
  }

  create(data: any): RecurringRule {
    return this.repo.create(data) as any;
  }

  async save(entity: RecurringRule): Promise<RecurringRule> {
    return this.repo.save(entity);
  }

  async softDelete(id: string) {
    return this.repo.softDelete({ id });
  }

  async findDueRules(now: Date, limit: number = 200) {
    return this.repo.find({
      where: {
        deletedAt: IsNull() as any,
        nextRunAt: LessThanOrEqual(now) as any,
      },
      take: limit,
      order: { nextRunAt: 'ASC' as any },
    });
  }

  async findAccount(id: string, workspaceId: string) {
    return this.accountRepo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
  }

  async findCategory(id: string, workspaceId: string) {
    return this.categoryRepo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
  }

  getRepository() {
    return this.repo;
  }
}
