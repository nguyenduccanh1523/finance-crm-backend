import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Account } from '../entities/account.entity';

@Injectable()
export class AccountsRepository {
  constructor(
    @InjectRepository(Account)
    private readonly repo: Repository<Account>,
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

  async findById(id: string) {
    return this.repo.findOne({ where: { id, deletedAt: IsNull() as any } });
  }

  async findFirst(workspaceId: string, order = { createdAt: 'ASC' as any }) {
    return this.repo.findOne({
      where: { workspaceId, deletedAt: IsNull() as any },
      order,
    });
  }

  async count(workspaceId: string) {
    return this.repo.count({
      where: { workspaceId, deletedAt: IsNull() as any },
    });
  }

  create(data: any): Account {
    return this.repo.create(data) as any;
  }

  async save(entity: Account): Promise<Account> {
    return this.repo.save(entity);
  }

  async softDelete(id: string) {
    return this.repo.softDelete({ id });
  }

  async findByIdWithoutDeleted(id: string) {
    return this.repo.findOne({ where: { id } });
  }

  /**
   * Lấy danh sách tất cả accounts kèm balance và currency.
   * Trả về từng account (không gộp) để frontend hiển thị dòng tiền ở mỗi tài khoản.
   * Đồng thời tính tổng và số lượng để phục vụ trend text.
   */
  async getAccountsWithBalance(workspaceId: string): Promise<{
    accounts: Array<{
      id: string;
      name: string;
      type: string;
      currency: string;
      currentBalanceCents: number;
    }>;
    accountCount: number;
  }> {
    const accounts = await this.repo.find({
      where: { workspaceId, deletedAt: IsNull() as any },
      select: ['id', 'name', 'type', 'currency', 'currentBalanceCents'],
      order: { createdAt: 'ASC' as any },
    });

    return {
      accounts: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type as string,
        currency: a.currency,
        currentBalanceCents: Number(a.currentBalanceCents),
      })),
      accountCount: accounts.length,
    };
  }
}

