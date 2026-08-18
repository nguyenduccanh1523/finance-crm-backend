import { EntityTarget } from 'typeorm';
import { CrmCustomer } from './crm/entities/crm-customer.entity';
import { CrmContact } from './crm/entities/crm-contact.entity';
import { CrmActivity } from './crm/entities/crm-activity.entity';
import { Status } from './workflow/entities/status.entity';
import { WorkType } from './workflow/entities/work-type.entity';
import { Project } from './projects/entities/project.entity';
import { Task } from './projects/entities/task.entity';
import { Invoice } from './finance/entities/invoice.entity';
import { OrgExpense } from './finance/entities/org-expense.entity';
import { AttendanceRecord } from './time/entities/attendance-record.entity';
import { TimesheetEntry } from './time/entities/timesheet-entry.entity';
import { Conversation } from './communication/entities/conversation.entity';
import { Message } from './communication/entities/message.entity';
import { Email } from './communication/entities/email.entity';
import { Report } from './communication/entities/report.entity';

export interface BusinessResource {
  entity: EntityTarget<any>;
  /** Text columns participating in PostgreSQL ILIKE search. */
  searchColumns: string[];
  /** Server-owned fields, set from the authenticated membership when creating. */
  membershipFields?: string[];
  userFields?: string[];
}

export const BUSINESS_RESOURCES: Record<string, BusinessResource> = {
  'crm-customers': {
    entity: CrmCustomer,
    searchColumns: ['name', 'industry', 'email', 'phone', 'stage'],
    membershipFields: ['ownerMembershipId'],
  },
  'crm-contacts': {
    entity: CrmContact,
    searchColumns: ['fullName', 'email', 'phone', 'title', 'notes'],
  },
  'crm-activities': {
    entity: CrmActivity,
    searchColumns: ['type', 'summary'],
    membershipFields: ['createdByMembershipId'],
  },
  statuses: { entity: Status, searchColumns: ['entityType', 'name'] },
  'work-types': { entity: WorkType, searchColumns: ['name', 'color'] },
  projects: {
    entity: Project,
    searchColumns: ['name', 'description'],
    membershipFields: ['ownerMembershipId'],
  },
  tasks: {
    entity: Task,
    searchColumns: ['title', 'description'],
    userFields: ['createdBy'],
  },
  invoices: { entity: Invoice, searchColumns: ['number', 'currency'] },
  expenses: {
    entity: OrgExpense,
    searchColumns: ['category', 'note', 'currency'],
    userFields: ['createdBy'],
  },
  attendance: {
    entity: AttendanceRecord,
    searchColumns: ['status', 'note'],
    membershipFields: ['membershipId'],
  },
  timesheets: {
    entity: TimesheetEntry,
    searchColumns: ['status', 'description'],
    membershipFields: ['membershipId'],
  },
  conversations: {
    entity: Conversation,
    searchColumns: ['title', 'type'],
    userFields: ['createdBy'],
  },
  messages: {
    entity: Message,
    searchColumns: ['body'],
    membershipFields: ['senderMembershipId'],
  },
  emails: {
    entity: Email,
    searchColumns: ['fromEmail', 'subject', 'body', 'providerMsgId'],
  },
  reports: {
    entity: Report,
    searchColumns: ['type', 'fileUrl'],
    userFields: ['generatedByUserId'],
  },
};
