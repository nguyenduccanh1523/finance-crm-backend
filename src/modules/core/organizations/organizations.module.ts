import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './organization.entity';
import { OrganizationsController } from './organizations.controller';
import { OrganizationContextService } from './organization-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([Organization])],
  controllers: [OrganizationsController],
  providers: [OrganizationContextService],
  exports: [TypeOrmModule, OrganizationContextService],
})
export class OrganizationsModule {}
