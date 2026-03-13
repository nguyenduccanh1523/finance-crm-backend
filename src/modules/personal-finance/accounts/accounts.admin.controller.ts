import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { AccountsService } from './accounts.service';
import { AdminCreateAccountDto } from './dto/admin-create-account-unified.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('billing/admin/personal/accounts')
export class AccountsAdminController {
  constructor(private readonly service: AccountsService) {}

  @Post()
  create(@Body() dto: AdminCreateAccountDto) {
    return this.service.adminCreate(dto);
  }
}
