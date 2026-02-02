import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { AdminCreateCategoryDto } from './dto/admin-create-category.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('billing/admin/personal/users/:userId/categories')
export class CategoriesAdminController {
  constructor(private readonly service: CategoriesService) {}

  @Post()
  create(@Param('userId') userId: string, @Body() dto: AdminCreateCategoryDto) {
    return this.service.adminCreate(userId, dto);
  }
}
