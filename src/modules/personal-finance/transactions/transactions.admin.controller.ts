import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { TransactionsService } from './transactions.service';
import { AdminCreateTransactionDto } from './dto/admin-create-transaction.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
@Controller('billing/admin/personal/users/:userId/transactions')
export class TransactionsAdminController {
  constructor(private readonly service: TransactionsService) {}

  @Post()
  create(
    @Param('userId') userId: string,
    @Body() dto: AdminCreateTransactionDto,
  ) {
    return this.service.adminCreate(userId, dto);
  }
}
