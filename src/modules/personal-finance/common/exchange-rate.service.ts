import { Injectable } from '@nestjs/common';
import { ExchangeRateRepository } from './exchange-rate.repository';

@Injectable()
export class ExchangeRateService {
  constructor(private exchangeRateRepository: ExchangeRateRepository) {}

  /**
   * Quy đổi số tiền từ currency này sang currency khác
   *
   * VD: convertAmount(100000, 'USD', 'VND', workspaceId)
   * => 100000 USD * rate = 2,450,000,000 VND
   */
  async convertAmount(
    amountCents: number,
    fromCurrency: string,
    toCurrency: string,
    workspaceId: string,
  ): Promise<number> {
    // Nếu cùng currency thì không cần convert
    if (fromCurrency === toCurrency) {
      return amountCents;
    }

    const rate = await this.getExchangeRate(
      fromCurrency,
      toCurrency,
      workspaceId,
    );

    if (!rate) {
      throw new Error(
        `Không tìm thấy tỷ giá từ ${fromCurrency} sang ${toCurrency}`,
      );
    }

    return Math.round(amountCents * rate.rate);
  }

  /**
   * Lấy tỷ giá quy đổi
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    workspaceId: string,
  ) {
    return this.exchangeRateRepository.getRate(
      workspaceId,
      fromCurrency,
      toCurrency,
    );
  }

  /**
   * Cập nhật tỷ giá
   */
  async updateRate(
    workspaceId: string,
    fromCurrency: string,
    toCurrency: string,
    rate: number,
  ) {
    return this.exchangeRateRepository.upsertRate(
      workspaceId,
      fromCurrency,
      toCurrency,
      rate,
    );
  }

  /**
   * Quy đổi về base currency của workspace
   * VD: workspace có base USD, thì quy đổi tất cả sang USD
   */
  async convertToBaseCurrency(
    amountCents: number,
    sourceCurrency: string,
    workspaceId: string,
  ): Promise<number> {
    // Lấy base currency setting của workspace
    const rates =
      await this.exchangeRateRepository.getRatesByWorkspace(workspaceId);
    const baseCurrency = rates[0]?.baseCurrency || 'VND';

    if (sourceCurrency === baseCurrency) {
      return amountCents;
    }

    return this.convertAmount(
      amountCents,
      sourceCurrency,
      baseCurrency,
      workspaceId,
    );
  }

  /**
   * Quy đổi từ base currency về currency khác
   */
  async convertFromBaseCurrency(
    amountCents: number,
    targetCurrency: string,
    workspaceId: string,
  ): Promise<number> {
    const rates =
      await this.exchangeRateRepository.getRatesByWorkspace(workspaceId);
    const baseCurrency = rates[0]?.baseCurrency || 'VND';

    if (targetCurrency === baseCurrency) {
      return amountCents;
    }

    return this.convertAmount(
      amountCents,
      baseCurrency,
      targetCurrency,
      workspaceId,
    );
  }
}
