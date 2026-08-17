import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { cookieConfig } from '../../../config/cookie.config';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OrganizationContextService } from './organization-context.service';
import type { AuthenticatedUser } from './organization-context.service';
import { AddOrganizationMemberDto } from './dto/add-organization-member.dto';
import { ProvisionOrganizationAdminDto } from './dto/provision-organization-admin.dto';

const ACTIVE_ORG_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

@ApiTags('Organizations')
@ApiCookieAuth('access_token')
@UseGuards(JwtAuthGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly contextService: OrganizationContextService) {}

  @Get()
  @ApiOperation({
    summary: 'List organizations available to the signed-in user',
  })
  async list(@CurrentUser() user: AuthenticatedUser) {
    return {
      statusCode: 200,
      message: 'Organizations retrieved successfully',
      data: await this.contextService.listAvailableOrganizations(user),
    };
  }

  @Get('current')
  @ApiOperation({
    summary: 'Get the organization selected in the active_org_id cookie',
  })
  async current(@CurrentUser() user: AuthenticatedUser, @Req() req: Request) {
    return {
      statusCode: 200,
      message: 'Current organization retrieved successfully',
      data: await this.contextService.getCurrentOrganization(
        user,
        req.cookies?.active_org_id,
      ),
    };
  }

  @Post('provision-admin')
  @ApiOperation({
    summary:
      'Create an organization, its ORG_ADMIN account, membership, and personal workspace (SUPER_ADMIN/TESTER only)',
  })
  async provisionAdmin(
    @Body() dto: ProvisionOrganizationAdminDto,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.contextService.provisionOrganizationAdmin(
      user,
      dto,
    );
    res.cookie('active_org_id', result.organization.id, {
      ...cookieConfig,
      maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    });
    return {
      statusCode: 201,
      message: 'Organization administrator provisioned successfully',
      data: result,
    };
  }

  @Post('members')
  @ApiOperation({
    summary:
      'Add an existing user as ORG_MEMBER to the active organization (ORG_ADMIN, SUPER_ADMIN, or TESTER)',
  })
  async addMember(
    @Body() dto: AddOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return {
      statusCode: 201,
      message: 'Organization member added successfully',
      data: await this.contextService.addOrganizationMember(
        user,
        req.cookies?.active_org_id,
        dto,
      ),
    };
  }

  @Post(':orgId/select')
  @ApiOperation({
    summary: 'Select the active organization and set its HttpOnly cookie',
  })
  async select(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const context = await this.contextService.selectOrganization(user, orgId);
    res.cookie('active_org_id', orgId, {
      ...cookieConfig,
      maxAge: ACTIVE_ORG_COOKIE_MAX_AGE,
    });
    return {
      statusCode: 200,
      message: 'Active organization selected successfully',
      data: context,
    };
  }

  @Delete('current')
  @ApiOperation({ summary: 'Clear the active organization cookie' })
  clear(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('active_org_id', cookieConfig);
    return {
      statusCode: 200,
      message: 'Active organization cleared successfully',
      data: null,
    };
  }
}
