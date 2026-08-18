import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../core/auth/decorators/current-user.decorator';
import { BusinessCrudService } from './business-crud.service';
import { BusinessListQuery } from './dto/business-list.query';
import { BUSINESS_RESOURCES } from './business-resources';

const resourceNames = Object.keys(BUSINESS_RESOURCES);

@ApiTags('Business — generic CRUD')
@ApiBearerAuth()
@ApiHeader({
  name: 'x-org-id',
  required: true,
  description: 'Active organization UUID. The caller must be an active member.',
})
@UseGuards(JwtAuthGuard)
@Controller('business')
export class BusinessController {
  constructor(private readonly service: BusinessCrudService) {}

  @Get(':resource')
  @ApiOperation({ summary: 'List/search a business resource' })
  @ApiParam({ name: 'resource', enum: resourceNames })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({
    name: 'filters',
    required: false,
    description: 'URL-encoded JSON, e.g. {"statusId":"uuid"}',
  })
  list(
    @Param('resource') resource: string,
    @Headers('x-org-id') orgId: string,
    @CurrentUser() user: any,
    @Query() query: BusinessListQuery,
  ) {
    return this.service.list(resource, orgId, user.id, query);
  }
  @Get(':resource/:id')
  @ApiOperation({ summary: 'Get one business resource' })
  @ApiParam({ name: 'id', format: 'uuid' })
  get(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Headers('x-org-id') orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.get(resource, id, orgId, user.id);
  }
  @Post(':resource')
  @ApiOperation({ summary: 'Create a business resource' })
  create(
    @Param('resource') resource: string,
    @Headers('x-org-id') orgId: string,
    @CurrentUser() user: any,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.create(resource, orgId, user.id, body);
  }
  @Patch(':resource/:id')
  @ApiOperation({ summary: 'Update a business resource' })
  update(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Headers('x-org-id') orgId: string,
    @CurrentUser() user: any,
    @Body() body: Record<string, unknown>,
  ) {
    return this.service.update(resource, id, orgId, user.id, body);
  }
  @Delete(':resource/:id')
  @ApiOperation({ summary: 'Delete a business resource' })
  remove(
    @Param('resource') resource: string,
    @Param('id') id: string,
    @Headers('x-org-id') orgId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.remove(resource, id, orgId, user.id);
  }
}
