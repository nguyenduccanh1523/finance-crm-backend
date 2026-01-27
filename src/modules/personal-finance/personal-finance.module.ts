import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PersonalWorkspace,
  Account,
  Category,
  Tag,
  Transaction,
  TransactionTag,
  RecurringRule,
  Budget,
  Goal,
  Attachment,
} from './entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonalWorkspace,
      Account,
      Category,
      Tag,
      Transaction,
      TransactionTag,
      RecurringRule,
      Budget,
      Goal,
      Attachment,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class PersonalFinanceModule {}
