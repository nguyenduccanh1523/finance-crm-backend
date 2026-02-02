import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PlanService } from './plan.service';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { Roles } from '../core/auth/decorators/roles.decorator';
import { RolesGuard } from '../core/auth/guards/roles.guard';
import { PatchPlanFlagDto } from './dto/patch-plan-flag.dto';
import { PatchPlanQuotaDto } from './dto/patch-plan-quota.dto';

@Controller('billing/admin/plans')
export class PlanAdminController {
  constructor(private readonly planService: PlanService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Post('seed-default')
  seedDefault() {
    return this.planService.seedDefaultPlans();
  }

  // ✅ PATCH 1 flag nhỏ + auto lan theo tier
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':code/flags')
  patchFlag(@Param('code') code: string, @Body() dto: PatchPlanFlagDto) {
    return this.planService.patchFlagWithTier(code, dto.flag, dto.enabled);
  }

  // ✅ PATCH 1 quota
  // - default: chỉ patch đúng plan code
  // - propagate=true: patch code và các tier cao hơn
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN')
  @Patch(':code/quotas')
  patchQuota(@Param('code') code: string, @Body() dto: PatchPlanQuotaDto) {
    return this.planService.patchQuotaWithTier(
      code,
      dto.key,
      dto.value,
      dto.propagate ?? false,
    );
  }
}
