import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { FeatureGuard } from '../../billing/guards/feature.guard';
import { RequireFeatures } from '../../billing/guards/require-features.decorator';
import { FeatureCodes } from '../../billing/features/feature-codes';
import { CurrentUser } from 'src/modules/core/auth/decorators/current-user.decorator';
import { BudgetsService } from './budgets.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeatures(FeatureCodes.FINANCE_REPORTS)
@Controller('personal/budgets')
export class BudgetsController {
  constructor(private readonly service: BudgetsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user);
  }

  @Post()
  upsert(@CurrentUser() user: any, @Body() dto: CreateBudgetDto) {
    return this.service.upsert(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
