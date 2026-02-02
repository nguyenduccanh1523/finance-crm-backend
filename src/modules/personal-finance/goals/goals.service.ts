import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Goal } from '../entities/goal.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { personalErrors } from '../common/personal.errors';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    @InjectRepository(Goal) private readonly repo: Repository<Goal>,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { createdAt: 'DESC' as any },
    });
  }

  async create(user: any, dto: CreateGoalDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const entity = this.repo.create({
      workspaceId,
      name: dto.name,
      targetAmountCents: dto.targetAmountCents,
      targetDate: dto.targetDate,
      status: dto.status,
      currentAmountCents: 0,
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateGoalDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const g = await this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!g) throw personalErrors.resourceNotFound('goal');

    if (dto.name !== undefined) g.name = dto.name;
    if (dto.targetAmountCents !== undefined)
      g.targetAmountCents = dto.targetAmountCents;
    if (dto.targetDate !== undefined) g.targetDate = dto.targetDate;
    if (dto.currentAmountCents !== undefined)
      g.currentAmountCents = dto.currentAmountCents;
    if (dto.status !== undefined) g.status = dto.status;

    return this.repo.save(g);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const g = await this.repo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!g) throw personalErrors.resourceNotFound('goal');
    await this.repo.softDelete({ id });
    return { ok: true };
  }
}
