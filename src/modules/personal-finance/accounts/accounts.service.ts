import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AccountsRepository } from './accounts.repository';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AdminCreateAccountDto } from './dto/admin-create-account-unified.dto';
import { personalErrors } from '../common/personal.errors';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { AccountType } from '../../../common/enums/account-type.enum';

@Injectable()
export class AccountsService {
  constructor(
    private readonly repo: AccountsRepository,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any, page: number = 1, limit: number = 20) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const cleanLimit = Math.min(limit || 20, 100); // Max 100 per page
    const { items, total } = await this.repo.list(
      workspaceId,
      page,
      cleanLimit,
    );

    return {
      statusCode: 200,
      message: 'Success',
      data: items,
      pagination: {
        page,
        limit: cleanLimit,
        total,
        totalPages: Math.ceil(total / cleanLimit),
      },
    };
  }

  async create(user: any, dto: CreateAccountDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    // quota check
    const used = await this.repo.count(ws.id);
    await this.policy.assertQuota(user, PersonalQuotaKeys.ACCOUNTS_MAX, used);

    const currency = dto.currency ?? ws.defaultCurrency;
    const opening = dto.openingBalanceCents ?? 0;

    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name,
      type: dto.type,
      currency,
      openingBalanceCents: opening,
      currentBalanceCents: opening,
    });
    return this.repo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateAccountDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const acc = await this.repo.findOne(id, workspaceId);
    if (!acc) throw personalErrors.resourceNotFound('account');

    if (dto.openingBalanceCents !== undefined) {
      // Keep balances consistent; if you want, compute delta and update current as well.
      const delta =
        Number(dto.openingBalanceCents) - Number(acc.openingBalanceCents);
      acc.openingBalanceCents = dto.openingBalanceCents as any;
      acc.currentBalanceCents = (Number(acc.currentBalanceCents) +
        delta) as any;
    }
    if (dto.name !== undefined) acc.name = dto.name;
    if (dto.type !== undefined) acc.type = dto.type;
    if (dto.currency !== undefined) acc.currency = dto.currency;

    return this.repo.save(acc);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const acc = await this.repo.findOne(id, workspaceId);
    if (!acc) throw personalErrors.resourceNotFound('account');
    await this.repo.softDelete(id);
    return { ok: true };
  }

  // -------- ADMIN - Unified Endpoint --------
  async adminCreate(dto: AdminCreateAccountDto) {
    const defaultType = AccountType.CASH as any;

    // Route by scope
    if (dto.scope === 'workspace') {
      if (!dto.workspaceId) {
        throw personalErrors.invalidInput(
          'workspaceId required for workspace scope',
        );
      }
      return this.createWorkspaceAccount(dto.workspaceId, dto, defaultType);
    }

    if (dto.scope === 'user') {
      if (!dto.userId) {
        throw personalErrors.invalidInput('userId required for user scope');
      }
      return this.createUserAccount(dto.userId, dto, defaultType);
    }

    throw personalErrors.invalidInput('Invalid scope');
  }

  private async createWorkspaceAccount(
    workspaceId: string,
    dto: AdminCreateAccountDto,
    defaultType: any,
  ) {
    // Get workspace to get default currency
    const ws = await this.wsService.findById(workspaceId);
    if (!ws) throw personalErrors.resourceNotFound('workspace');

    const entity = this.repo.create({
      workspaceId,
      name: dto.name,
      type: dto.type ?? defaultType,
      currency: ws.defaultCurrency,
      openingBalanceCents: 0,
      currentBalanceCents: 0,
    });
    return this.repo.save(entity);
  }

  private async createUserAccount(
    userId: string,
    dto: AdminCreateAccountDto,
    defaultType: any,
  ) {
    const ws = await this.wsService.getOrCreateByUserId(userId);

    const entity = this.repo.create({
      workspaceId: ws.id,
      name: dto.name ?? 'Untitled Account',
      type: dto.type ?? defaultType,
      currency: ws.defaultCurrency,
      openingBalanceCents: 0,
      currentBalanceCents: 0,
    });
    return this.repo.save(entity);
  }

  async ensureDefaultAccount(userId: string) {
    const ws = await this.wsService.getOrCreateByUserId(userId);
    let acc = await this.repo.findFirst(ws.id);
    if (acc) return acc;

    acc = await this.repo.save(
      this.repo.create({
        workspaceId: ws.id,
        name: 'Cash',
        type: AccountType.CASH as any,
        currency: ws.defaultCurrency,
        openingBalanceCents: 0,
        currentBalanceCents: 0,
      }),
    );
    return acc;
  }
}
