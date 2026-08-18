import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../core/organizations/organization-context.service';
import { CrmCustomersService } from './crm-customers.service';
import {
  CreateCrmCustomerDto,
  ListCrmCustomersQueryDto,
  UpdateCrmCustomerDto,
} from './dto/crm-customer.dto';

@ApiTags('CRM clients')
@ApiCookieAuth('access_token')
@ApiHeader({
  name: 'x-org-id',
  required: false,
  description:
    'Optional fallback for API clients. Browser requests use active_org_id cookie.',
})
@UseGuards(JwtAuthGuard)
@Controller('business/clients')
export class CrmCustomersController {
  constructor(private readonly service: CrmCustomersService) {}

  @Get()
  @ApiOperation({
    summary: 'List clients with pagination, search, sorting, and filters',
  })
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
    @Query() query: ListCrmCustomersQueryDto,
  ) {
    return this.service.list(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
      query,
    );
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get organization-scoped client summary cards' })
  summary(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
  ) {
    return this.service.summary(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
    );
  }

  @Get('metadata')
  @ApiOperation({
    summary:
      'Get client stages, types, and valid owners for the active organization',
  })
  metadata(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
  ) {
    return this.service.metadata(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one client' })
  get(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.get(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
      id,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a client in the active organization' })
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
    @Body() dto: CreateCrmCustomerDto,
  ) {
    return this.service.create(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
      dto,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client in the active organization' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmCustomerDto,
  ) {
    return this.service.update(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
      id,
      dto,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete a client in the active organization' })
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Headers('x-org-id') fallbackOrgId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(
      user,
      req.cookies?.active_org_id,
      fallbackOrgId,
      id,
    );
  }
}
