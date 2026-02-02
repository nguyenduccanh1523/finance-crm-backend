import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { TagsService } from './tags.service';
import { AdminCreateTagDto } from './dto/admin-create-tag.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('billing/admin/personal/users/:userId/tags')
export class TagsAdminController {
  constructor(private readonly service: TagsService) {}

  @Post()
  create(@Param('userId') userId: string, @Body() dto: AdminCreateTagDto) {
    return this.service.adminCreate(userId, dto);
  }
}
