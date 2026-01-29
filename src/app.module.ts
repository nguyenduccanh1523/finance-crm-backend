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
import { SeedModule } from './modules/core/seed/seed.module';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-ioredis';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmModuleOptions),
    CacheModule.register({
      isGlobal: true,
      store: redisStore as any,
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      ttl: 300, // seconds
      max: 1000, // maximum number of items in cache
    }),

    // Core modules
    UsersModule,
    OrganizationsModule,
    RbacModule,
    AuthModule,
    BillingModule,
    PersonalFinanceModule,
    BusinessModule,
    SeedModule,
  ],
})
export class AppModule {}
