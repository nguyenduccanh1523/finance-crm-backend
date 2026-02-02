import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';
import { PersonalWorkspaceService } from '../workspace/personal-workspace.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { AdminCreateAccountDto } from './dto/admin-create-account.dto';
import { personalErrors } from '../common/personal.errors';
import { PersonalPlanPolicyService } from '../common/personal-plan-policy.service';
import { PersonalQuotaKeys } from '../common/personal.constants';
import { AccountType } from '../../../common/enums/account-type.enum';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    private readonly wsService: PersonalWorkspaceService,
    private readonly policy: PersonalPlanPolicyService,
  ) {}

  async list(user: any) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    return this.accountRepo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      order: { createdAt: 'DESC' as any },
    });
  }

  async create(user: any, dto: CreateAccountDto) {
    const ws = await this.wsService.getOrCreateByUserId(user.id);

    // quota check
    const used = await this.accountRepo.count({
      where: { workspaceId: ws.id, deletedAt: IsNull() as any },
    });
    await this.policy.assertQuota(user, PersonalQuotaKeys.ACCOUNTS_MAX, used);

    const currency = dto.currency ?? ws.defaultCurrency;
    const opening = dto.openingBalanceCents ?? 0;

    const entity = this.accountRepo.create({
      workspaceId: ws.id,
      name: dto.name,
      type: dto.type,
      currency,
      openingBalanceCents: opening,
      currentBalanceCents: opening,
    });
    return this.accountRepo.save(entity);
  }

  async update(user: any, id: string, dto: UpdateAccountDto) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const acc = await this.accountRepo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
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

    return this.accountRepo.save(acc);
  }

  async remove(user: any, id: string) {
    const workspaceId = await this.wsService.getWorkspaceIdByUserId(user.id);
    const acc = await this.accountRepo.findOne({
      where: { id, workspaceId, deletedAt: IsNull() as any },
    });
    if (!acc) throw personalErrors.resourceNotFound('account');
    await this.accountRepo.softDelete({ id });
    return { ok: true };
  }

  // -------- ADMIN --------
  async adminCreate(userId: string, dto: AdminCreateAccountDto) {
    const ws = await this.wsService.getOrCreateByUserId(userId);

    const entity = this.accountRepo.create({
      workspaceId: ws.id,
      name: dto.name ?? 'Untitled Account',
      type: dto.type ?? (AccountType.CASH as any),
      currency: dto.currency ?? ws.defaultCurrency,
      openingBalanceCents: dto.openingBalanceCents ?? 0,
      currentBalanceCents: dto.openingBalanceCents ?? 0,
    });
    return this.accountRepo.save(entity);
  }

  async ensureDefaultAccount(userId: string) {
    const ws = await this.wsService.getOrCreateByUserId(userId);
    let acc = await this.accountRepo.findOne({
      where: { workspaceId: ws.id, deletedAt: IsNull() as any },
      order: { createdAt: 'ASC' as any },
    });
    if (acc) return acc;

    acc = await this.accountRepo.save(
      this.accountRepo.create({
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
