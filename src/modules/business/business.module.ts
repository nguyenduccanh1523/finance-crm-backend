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

@Module({
  imports: [
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
  exports: [TypeOrmModule],
})
export class BusinessModule {}
