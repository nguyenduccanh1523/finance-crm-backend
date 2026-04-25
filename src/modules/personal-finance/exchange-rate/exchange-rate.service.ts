import { HttpService } from '@nestjs/axios';
import { firstValueFrom, from } from 'rxjs';
import { BadGatewayException, Injectable } from '@nestjs/common';

type PairRateResult = {
  from: string;
  to: string;
  rate: number;
  date: string | null;
  providers: string | null;
  source: 'frankfurter';
  cached: boolean;
};

@Injectable()
export class ExchangeRateService {
  private readonly apiBaseUrl = 'https://api.frankfurter.dev/v2';
  private readonly cacheTtlMs = 5 * 60 * 1000;

  private readonly pairRateCache = new Map<
    string,
    { expiresAt: number; result: PairRateResult }
  >();

  constructor(private readonly httpService: HttpService) {}

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private buildRateCacheKey(
    from: string,
    to: string,
    date: string,
    providers: string,
  ): string {
    return [
      this.normalizeCode(from),
      this.normalizeCode(to),
      date || '',
      providers || '',
    ].join(':');
  }

  async getPairRate(
    from: string,
    to: string,
    date: string,
    providers: string,
  ): Promise<PairRateResult> {
    const fromCode = this.normalizeCode(from);
    const toCode = this.normalizeCode(to);

    if (fromCode === toCode) {
      return {
        from: fromCode,
        to: toCode,
        rate: 1,
        date: date ?? null,
        providers: providers ?? null,
        source: 'frankfurter',
        cached: true,
      };
    }

    const cacheKey = this.buildRateCacheKey(fromCode, toCode, date, providers);
    const now = Date.now();
    const cached = this.pairRateCache.get(cacheKey);

    if (cached && cached.expiresAt > now) {
      return {
        ...cached.result,
        cached: true,
      };
    }

    const params: Record<string, string> = {};
    if (date) params.date = date;
    if (providers) params.providers = providers;

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/rate/${fromCode}/${toCode}`, {
          params,
        }),
      );

      const rate = Number(response.data.rate);
      if (!Number.isFinite(rate) || rate <= 0) {
        throw new BadGatewayException(
          'Frankfurter returned an invalid exchange rate',
        );
      }

      const result: PairRateResult = {
        from: fromCode,
        to: toCode,
        rate,
        date: date ?? null,
        providers: providers ?? null,
        source: 'frankfurter',
        cached: false,
      };

      this.pairRateCache.set(cacheKey, {
        expiresAt: now + this.cacheTtlMs,
        result,
      });

      return result;
    } catch (error: any) {
      const providerStatus = error.response?.status;
      const providerMessage =
        error?.response?.data?.message || 'Failed to fetch exchange rate';

      if (providerStatus && providerStatus >= 400 && providerStatus < 500) {
        throw new BadGatewayException(providerMessage);
      }

      throw new BadGatewayException(providerMessage);
    }
  }

  async convert(
    amount: number,
    from: string,
    to: string,
    date: string,
    providers: string,
  ) {
    if (!Number.isFinite(amount)) {
      throw new BadGatewayException(
        'Amount must be a valid non-negative number',
      );
    }

    const rateData = await this.getPairRate(from, to, date, providers);

    return {
      amount,
      from: rateData.from,
      to: rateData.to,
      rate: rateData.rate,
      convertedAmount: Number((amount * rateData.rate).toFixed(2)),
      date: rateData.date,
      providers: rateData.providers,
      source: rateData.source,
      cached: rateData.cached,
    };
  }

  async getCurrencies(scope?: string) {
    const params: Record<string, string> = {};
    if (scope === 'all') {
      params.scope = 'all';
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/currencies`, { params }),
      );

      const raw = response.data;

      const items = Array.isArray(raw)
        ? raw
        : Object.entries(raw || {}).map(([code, value]) => {
            if (typeof value === 'string') {
              return { code, name: value };
            }

            if (value && typeof value === 'object') {
              return { code, ...(value as Record<string, unknown>) };
            }

            return { code, value };
          });

      return items;
    } catch (error: any) {
      const providerMessage =
        error?.response?.data?.message || 'Failed to fetch currencies';

      throw new BadGatewayException(providerMessage);
    }
  }

  async getProviders() {
    try {
      const response = await firstValueFrom(
        this.httpService.get(`${this.apiBaseUrl}/providers`),
      );

      const raw = response.data;

      const items = Array.isArray(raw)
        ? raw
        : Object.entries(raw || {}).map(([code, value]) => {
            if (typeof value === 'string') {
              return { code, name: value };
            }

            if (value && typeof value === 'object') {
              return { code, ...(value as Record<string, unknown>) };
            }

            return { code, value };
          });

      return items;
    } catch (error: any) {
      const providerMessage =
        error?.response?.data?.message || 'Failed to fetch providers';

      throw new BadGatewayException(providerMessage);
    }
  }
}
