import { Controller, Get, Headers, Req, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { BusinessDashboardService } from './business-dashboard.service';
import { BusinessDashboardResponseDto } from './dto/business-dashboard-response.dto';

@ApiTags('Business dashboard')
@ApiCookieAuth('access_token')
@ApiHeader({
  name: 'x-org-id',
  required: false,
  description:
    'Optional fallback for Postman/legacy clients. Browser requests use the active_org_id cookie.',
})
@UseGuards(JwtAuthGuard)
@Controller('business/dashboard')
export class BusinessDashboardController {
  constructor(private readonly service: BusinessDashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Dashboard for ORG_ADMIN, SUPER_ADMIN, and TESTER',
  })
  @ApiForbiddenResponse({
    description: 'The caller is not an admin of the selected organization',
  })
  @ApiOkResponse({
    description: 'UI-ready CRM dashboard plus chart-ready labels and series',
    type: BusinessDashboardResponseDto,
  })
  getDashboard(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId?: string,
  ) {
    return this.service.getDashboard(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
    );
  }
}
