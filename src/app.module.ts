import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmModuleOptions } from './config/typeorm.config';

import { UsersModule } from './modules/core/users/users.module';
import { OrganizationsModule } from './modules/core/organizations/organizations.module';
import { RbacModule } from './modules/core/rbac/rbac.module';
import { AuthModule } from './modules/core/auth/auth.module';
import { BillingModule } from './modules/billing/billing.module';
import { PersonalFinanceModule } from './modules/personal-finance/personal-finance.module';
import { BusinessModule } from './modules/business/business.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmModuleOptions),

    // Core modules
    UsersModule,
    OrganizationsModule,
    RbacModule,
    AuthModule,
    BillingModule,
    PersonalFinanceModule,
    BusinessModule,
  ],
})
export class AppModule {}
