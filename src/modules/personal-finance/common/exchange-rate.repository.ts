import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExchangeRate } from '../entities/exchange-rate.entity';

@Injectable()
export class ExchangeRateRepository {
  constructor(
    @InjectRepository(ExchangeRate)
    private readonly repo: Repository<ExchangeRate>,
  ) {}

  /**
   * Lấy tỷ giá quy đổi từ một currency sang currency khác
   */
  async getRate(
    workspaceId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<ExchangeRate | null> {
    return this.repo.findOne({
      where: {
        workspaceId,
        fromCurrency,
        toCurrency,
      },
    });
  }

  /**
   * Lấy tất cả tỷ giá của một workspace
   */
  async getRatesByWorkspace(workspaceId: string): Promise<ExchangeRate[]> {
    return this.repo.find({
      where: { workspaceId },
      order: { createdAt: 'DESC' as any },
    });
  }

  /**
   * Tạo hoặc cập nhật tỷ giá
   */
  async upsertRate(
    workspaceId: string,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
    baseCurrency: string = 'VND',
  ): Promise<ExchangeRate> {
    let exchangeRate = await this.getRate(
      workspaceId,
      fromCurrency,
      toCurrency,
    );

    if (exchangeRate) {
      exchangeRate.rate = rate;
      exchangeRate.baseCurrency = baseCurrency;
      exchangeRate.updatedAt = new Date();
    } else {
      exchangeRate = this.repo.create({
        workspaceId,
        fromCurrency,
        toCurrency,
        rate,
        baseCurrency,
      });
    }

    return this.repo.save(exchangeRate);
  }

  /**
   * Xóa tỷ giá
   */
  async deleteRate(
    workspaceId: string,
    fromCurrency: string,
    toCurrency: string,
  ): Promise<void> {
    await this.repo.delete({
      workspaceId,
      fromCurrency,
      toCurrency,
    });
  }

  create(data: any): ExchangeRate {
    return this.repo.create(data) as any;
  }

  async save(entity: ExchangeRate): Promise<ExchangeRate> {
    return this.repo.save(entity);
  }
}
