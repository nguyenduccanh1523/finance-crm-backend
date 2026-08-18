import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmCustomer } from './crm/entities/crm-customer.entity';
import { CrmContact } from './crm/entities/crm-contact.entity';
import { CrmActivity } from './crm/entities/crm-activity.entity';
import { Status } from './workflow/entities/status.entity';
import { WorkType } from './workflow/entities/work-type.entity';
import { Project } from './projects/entities/project.entity';
import { ProjectMember } from './projects/entities/project-member.entity';
import { Task } from './projects/entities/task.entity';
import { TaskAssignee } from './projects/entities/task-assignee.entity';
import { Invoice } from './finance/entities/invoice.entity';
import { InvoiceItem } from './finance/entities/invoice-item.entity';
import { InvoicePayment } from './finance/entities/invoice-payment.entity';
import { OrgExpense } from './finance/entities/org-expense.entity';
import { AttendanceRecord } from './time/entities/attendance-record.entity';
import { TimesheetEntry } from './time/entities/timesheet-entry.entity';
import { Conversation } from './communication/entities/conversation.entity';
import { ConversationMember } from './communication/entities/conversation-member.entity';
import { Message } from './communication/entities/message.entity';
import { Email } from './communication/entities/email.entity';
import { Report } from './communication/entities/report.entity';
import { BusinessController } from './business.controller';
import { BusinessCrudService } from './business-crud.service';
import { BusinessDashboardController } from './dashboard/business-dashboard.controller';
import { BusinessDashboardService } from './dashboard/business-dashboard.service';
import { CrmCustomersController } from './clients/crm-customers.controller';
import { CrmCustomersService } from './clients/crm-customers.service';
import { WorkManagementController } from './work-management/work-management.controller';
import { WorkManagementService } from './work-management/work-management.service';
import { OrganizationsModule } from '../core/organizations/organizations.module';

@Module({
  imports: [
    OrganizationsModule,
    TypeOrmModule.forFeature([
      CrmCustomer,
      CrmContact,
      CrmActivity,
      Status,
      WorkType,
      Project,
      ProjectMember,
      Task,
      TaskAssignee,
      Invoice,
      InvoiceItem,
      InvoicePayment,
      OrgExpense,
      AttendanceRecord,
      TimesheetEntry,
      Conversation,
      ConversationMember,
      Message,
      Email,
      Report,
    ]),
  ],
  // Register explicit CRM routes before the generic :resource route.
  controllers: [
    BusinessDashboardController,
    CrmCustomersController,
    WorkManagementController,
    BusinessController,
  ],
  providers: [
    BusinessCrudService,
    BusinessDashboardService,
    CrmCustomersService,
    WorkManagementService,
  ],
  exports: [TypeOrmModule],
})
export class BusinessModule {}
