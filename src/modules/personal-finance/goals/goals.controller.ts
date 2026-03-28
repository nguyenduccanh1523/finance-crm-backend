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
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AllocateGoalDto } from './dto/allocate-goal.dto';
import { WithdrawGoalDto } from './dto/withdraw-goal.dto';

@UseGuards(JwtAuthGuard, FeatureGuard)
@Controller('personal/goals')
export class GoalsController {
  constructor(private readonly service: GoalsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user);
  }

  @Get(':id')
  getOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getOne(user, id);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateGoalDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }

  @Post(':id/allocate')
  allocate(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: AllocateGoalDto,
  ) {
    return this.service.allocate(user, id, dto);
  }

  @Post(':id/withdraw')
  withdraw(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: WithdrawGoalDto,
  ) {
    return this.service.withdraw(user, id, dto);
  }

  @Get(':id/transactions')
  getTransactionHistory(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.getTransactionHistory(user, id);
  }
}
