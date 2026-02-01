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

  // (tuỳ chọn) vẫn giữ endpoint replace full features
  // @Patch(':code/features') ...
}
