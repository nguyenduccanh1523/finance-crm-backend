import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { GetPairRateDto } from './dto/get-pair-rate.dto';
import { ConvertCurrencyDto } from './dto/convert-currency.dto';
import { GetCurrenciesDto } from './dto/get-currencies.dto';
import { JwtAuthGuard } from 'src/modules/core/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('personal-finance/exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  @Get('pair')
  async getPairRate(@Query() query: GetPairRateDto) {
    return this.exchangeRateService.getPairRate(
      query.from,
      query.to,
      query.date ?? '',
      query.providers ?? '',
    );
  }

  @Post('convert')
  async convert(@Body() body: ConvertCurrencyDto) {
    return this.exchangeRateService.convert(
      body.amount,
      body.from,
      body.to,
      body.date ?? '',
      body.providers ?? '',
    );
  }

  @Get('currencies')
  async getCurrencies(@Query() query: GetCurrenciesDto) {
    return this.exchangeRateService.getCurrencies(query.scope);
  }

  @Get('providers')
  async getProviders() {
    return this.exchangeRateService.getProviders();
  }
}
