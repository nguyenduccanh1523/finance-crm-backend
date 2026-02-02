import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Budget } from '../entities/budget.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { personalErrors } from '../common/personal.errors';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetsService {
  constructor(
    @InjectRepository(Budget) private readonly repo: Repository<Budget>,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.find({
      where: { workspaceId },
      order: { periodMonth: 'DESC' as any },
    });
  }

  async upsert(user: any, dto: CreateBudgetDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);

    const existing = await this.repo.findOne({
      where: {
        workspaceId,
        periodMonth: dto.periodMonth,
        categoryId: dto.categoryId ?? null,
      } as any,
    });

    if (existing) {
      existing.amountLimitCents = dto.amountLimitCents;
      existing.alertThresholdPercent =
        dto.alertThresholdPercent ?? existing.alertThresholdPercent;
      return this.repo.save(existing);
    }

    const entity = this.repo.create({
      workspaceId,
      periodMonth: dto.periodMonth,
      categoryId: dto.categoryId,
      amountLimitCents: dto.amountLimitCents,
      alertThresholdPercent: dto.alertThresholdPercent ?? 80,
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateBudgetDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const b = await this.repo.findOne({ where: { id, workspaceId } });
    if (!b) throw personalErrors.resourceNotFound('budget');

    if (dto.amountLimitCents !== undefined)
      b.amountLimitCents = dto.amountLimitCents;
    if (dto.alertThresholdPercent !== undefined)
      b.alertThresholdPercent = dto.alertThresholdPercent;

    return this.repo.save(b);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const b = await this.repo.findOne({ where: { id, workspaceId } });
    if (!b) throw personalErrors.resourceNotFound('budget');
    await this.repo.delete({ id });
    return { ok: true };
  }
}
