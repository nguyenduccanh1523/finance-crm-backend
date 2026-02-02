import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/core/auth/decorators/current-user.decorator';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { ListTransactionsQuery } from './dto/list-transactions.query';

@UseGuards(JwtAuthGuard)
@Controller('personal/transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  list(@CurrentUser() user: any, @Query() q: ListTransactionsQuery) {
    return this.service.list(user, q);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTransactionDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
