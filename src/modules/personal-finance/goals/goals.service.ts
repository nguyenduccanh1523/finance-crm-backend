import { Injectable } from '@nestjs/common';
import { GoalsRepository } from './goals.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { personalErrors } from '../common/personal.errors';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(
    private readonly repo: GoalsRepository,
    private readonly wsService: PersonalWorkspaceService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.repo.list(workspaceId);
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
    const g = await this.repo.findOne(id, workspaceId);
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
    const g = await this.repo.findOne(id, workspaceId);
    if (!g) throw personalErrors.resourceNotFound('goal');
    await this.repo.softDelete(id);
    return { ok: true };
  }
}
