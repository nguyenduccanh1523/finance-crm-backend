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
import { RecurringRulesService } from './recurring-rules.service';
import { CreateRecurringRuleDto } from './dto/create-recurring-rule.dto';
import { UpdateRecurringRuleDto } from './dto/update-recurring-rule.dto';

@UseGuards(JwtAuthGuard, FeatureGuard)
@RequireFeatures(FeatureCodes.FINANCE_REPORTS)
@Controller('personal/recurring-rules')
export class RecurringRulesController {
  constructor(private readonly service: RecurringRulesService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateRecurringRuleDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecurringRuleDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
