import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthenticatedUser, OrganizationContextService } from '../../core/organizations/organization-context.service';
import { Membership } from '../../core/rbac/membership.entity';
import { Project } from '../projects/entities/project.entity';
import { ProjectMember } from '../projects/entities/project-member.entity';
import { Task } from '../projects/entities/task.entity';
import { TaskAssignee } from '../projects/entities/task-assignee.entity';
import { TimesheetEntry } from '../time/entities/timesheet-entry.entity';
import { Status } from '../workflow/entities/status.entity';
import { WorkType } from '../workflow/entities/work-type.entity';
import { CreateProjectDto, CreateTaskDto, CreateTimesheetDto, UpdateProjectDto, UpdateTaskDto, UpdateTimesheetDto, WorkListQueryDto } from './dto/work-management.dto';

const ADMIN_ROLES = new Set(['ORG_ADMIN', 'SUPER_ADMIN', 'TESTER']);

@Injectable()
export class WorkManagementService {
  constructor(private readonly dataSource: DataSource, private readonly organizations: OrganizationContextService) {}

  private async context(user: AuthenticatedUser, activeOrgId?: string, fallbackOrgId?: string) {
    const context = await this.organizations.getCurrentOrganization(user, activeOrgId || fallbackOrgId);
    if (!context) throw new BadRequestException({ code: 'ORG_CONTEXT_REQUIRED', message: 'Select an active organization first' });
    return context;
  }
  private isAdmin(role: string) { return ADMIN_ROLES.has(role); }
  private requireAdmin(role: string) { if (!this.isAdmin(role)) throw new ForbiddenException('Organization administrator access is required'); }
  private async membership(orgId: string, userId: string) {
    const member = await this.dataSource.getRepository(Membership).findOne({ where: { orgId, userId, status: 1 } });
    if (!member) throw new ForbiddenException('Active organization membership was not found');
    return member;
  }
  private trim(value: string | null | undefined) { if (value === undefined) return undefined; if (value === null) return null; return value.trim() || null; }
  private async ensureDefaults(orgId: string) {
    const statusRepo = this.dataSource.getRepository(Status);
    const workTypeRepo = this.dataSource.getRepository(WorkType);
    if (!(await statusRepo.count({ where: { orgId, entityType: 'PROJECT' } }))) {
      await statusRepo.save(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED'].map((name, index) => statusRepo.create({ orgId, entityType: 'PROJECT', name, sortOrder: index, isDone: name === 'COMPLETED' })));
    }
    if (!(await statusRepo.count({ where: { orgId, entityType: 'TASK' } }))) {
      await statusRepo.save(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED'].map((name, index) => statusRepo.create({ orgId, entityType: 'TASK', name, sortOrder: index, isDone: name === 'DONE' || name === 'CANCELLED' })));
    }
    if (!(await workTypeRepo.count({ where: { orgId } }))) await workTypeRepo.save(workTypeRepo.create({ orgId, name: 'GENERAL', billable: true }));
  }
  private async status(orgId: string, id: string, entityType: 'PROJECT' | 'TASK') {
    const value = await this.dataSource.getRepository(Status).findOne({ where: { id, orgId, entityType } });
    if (!value) throw new BadRequestException(`Invalid ${entityType.toLowerCase()} status`);
    return value;
  }
  private async workType(orgId: string, id: string) {
    const value = await this.dataSource.getRepository(WorkType).findOne({ where: { id, orgId } });
    if (!value) throw new BadRequestException('Invalid work type');
    return value;
  }
  private async project(orgId: string, id: string) {
    const value = await this.dataSource.getRepository(Project).findOne({ where: { id, orgId } });
    if (!value) throw new NotFoundException('Project not found');
    return value;
  }
  private async task(orgId: string, id: string) {
    const value = await this.dataSource.getRepository(Task).findOne({ where: { id, orgId } });
    if (!value) throw new NotFoundException('Task not found');
    return value;
  }
  private async defaultStatus(orgId: string, entityType: 'PROJECT' | 'TASK') {
    const value = await this.dataSource.getRepository(Status).findOne({ where: { orgId, entityType }, order: { sortOrder: 'ASC' } });
    if (!value) throw new NotFoundException('Workflow defaults are unavailable');
    return value.id;
  }
  private async defaultWorkType(orgId: string) {
    const value = await this.dataSource.getRepository(WorkType).findOne({ where: { orgId }, order: { createdAt: 'ASC' } });
    if (!value) throw new NotFoundException('Work type defaults are unavailable');
    return value.id;
  }
  private async addProjectMembers(projectId: string, orgId: string, ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return;
    const count = await this.dataSource.getRepository(Membership).count({ where: unique.map((id) => ({ id, orgId, status: 1 })) });
    if (count !== unique.length) throw new BadRequestException('Every assignee must be an active organization member');
    const repo = this.dataSource.getRepository(ProjectMember);
    for (const membershipId of unique) await repo.createQueryBuilder().insert().values({ projectId, membershipId }).orIgnore().execute();
  }
  private async recalculateTaskMinutes(taskId: string) {
    await this.dataSource.query(`UPDATE tasks SET actual_minutes = COALESCE((SELECT SUM(minutes) FROM timesheet_entries WHERE task_id = $1), 0) WHERE id = $1`, [taskId]);
  }

  async metadata(user: AuthenticatedUser, active?: string, fallback?: string) {
    const ctx = await this.context(user, active, fallback); await this.ensureDefaults(ctx.organization.id);
    const orgId = ctx.organization.id;
    const currentMember = await this.membership(orgId, user.id);
    const [projectStatuses, taskStatuses, workTypes, members, projects, tasks] = await Promise.all([
      this.dataSource.getRepository(Status).find({ where: { orgId, entityType: 'PROJECT' }, order: { sortOrder: 'ASC' } }),
      this.dataSource.getRepository(Status).find({ where: { orgId, entityType: 'TASK' }, order: { sortOrder: 'ASC' } }),
      this.dataSource.getRepository(WorkType).find({ where: { orgId }, order: { name: 'ASC' } }),
      this.dataSource.query(`SELECT m.id, u.full_name AS name, u.email, u.avatar_url AS "avatarUrl" FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.org_id=$1 AND m.status=1 ORDER BY u.full_name`, [orgId]),
      this.dataSource.query(`SELECT id, name FROM projects WHERE org_id=$1 AND deleted_at IS NULL ORDER BY name`, [orgId]),
      this.dataSource.query(`SELECT t.id, t.project_id AS "projectId", t.title, COALESCE(array_agg(ta.membership_id) FILTER (WHERE ta.membership_id IS NOT NULL), '{}') AS "assigneeMembershipIds" FROM tasks t LEFT JOIN task_assignees ta ON ta.task_id=t.id WHERE t.org_id=$1 AND t.deleted_at IS NULL GROUP BY t.id ORDER BY t.title`, [orgId]),
    ]);
    return { statusCode: 200, message: 'Work management metadata retrieved', data: { accessRole: ctx.accessRole, currentMembershipId: currentMember.id, projectStatuses, taskStatuses, workTypes, members, projects, tasks } };
  }

  async listProjects(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, query: WorkListQueryDto) {
    const ctx = await this.context(user, active, fallback); const orgId = ctx.organization.id;
    const rows = await this.dataSource.query(`SELECT p.*, s.name AS "statusName", m.id AS "ownerMembershipId", u.full_name AS "ownerName", u.avatar_url AS "ownerAvatarUrl", COUNT(t.id)::int AS "taskCount" FROM projects p JOIN statuses s ON s.id=p.status_id JOIN memberships m ON m.id=p.owner_membership_id JOIN users u ON u.id=m.user_id LEFT JOIN tasks t ON t.project_id=p.id AND t.deleted_at IS NULL WHERE p.org_id=$1 AND p.deleted_at IS NULL AND ($2='' OR p.name ILIKE '%' || $2 || '%') GROUP BY p.id,s.name,m.id,u.full_name,u.avatar_url ORDER BY p.updated_at DESC`, [orgId, query.q?.trim() || '']);
    return { statusCode: 200, message: 'Projects retrieved', data: rows };
  }
  async projectDetail(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, id: string, query: WorkListQueryDto) {
    const ctx = await this.context(user, active, fallback);
    const orgId = ctx.organization.id;
    await this.project(orgId, id);
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;
    const [projectRows, summaryRows, timesheetRows, members, taskCountRows, tasks] = await Promise.all([
      this.dataSource.query(`SELECT p.*, s.name AS "statusName", u.full_name AS "ownerName", u.email AS "ownerEmail", u.avatar_url AS "ownerAvatarUrl" FROM projects p JOIN statuses s ON s.id=p.status_id JOIN memberships m ON m.id=p.owner_membership_id JOIN users u ON u.id=m.user_id WHERE p.id=$1 AND p.org_id=$2 AND p.deleted_at IS NULL`, [id, orgId]),
      this.dataSource.query(`SELECT COUNT(*)::int AS "taskCount", COUNT(*) FILTER (WHERE s.is_done)::int AS "completedTaskCount", COALESCE(SUM(t.estimate_minutes),0)::int AS "estimateMinutes", COALESCE(SUM(t.actual_minutes),0)::int AS "actualMinutes" FROM tasks t JOIN statuses s ON s.id=t.status_id WHERE t.project_id=$1 AND t.org_id=$2 AND t.deleted_at IS NULL`, [id, orgId]),
      this.dataSource.query(`SELECT COUNT(*)::int AS "entryCount", COALESCE(SUM(minutes),0)::int AS "totalMinutes", COALESCE(SUM(minutes) FILTER (WHERE status='APPROVED'),0)::int AS "approvedMinutes" FROM timesheet_entries WHERE project_id=$1 AND org_id=$2`, [id, orgId]),
      this.dataSource.query(`SELECT m.id AS "membershipId", u.full_name AS name, u.email, u.avatar_url AS "avatarUrl" FROM project_members pm JOIN memberships m ON m.id=pm.membership_id JOIN users u ON u.id=m.user_id WHERE pm.project_id=$1 ORDER BY u.full_name`, [id]),
      this.dataSource.query(`SELECT COUNT(*)::int AS total FROM tasks WHERE project_id=$1 AND org_id=$2 AND deleted_at IS NULL AND ($3::uuid IS NULL OR status_id=$3)`, [id, orgId, query.statusId || null]),
      this.dataSource.query(`SELECT t.*, s.name AS "statusName", w.name AS "workTypeName", COALESCE(array_agg(u.full_name) FILTER (WHERE u.id IS NOT NULL), '{}') AS "assigneeNames", COALESCE(json_agg(json_build_object('membershipId', m.id, 'name', u.full_name, 'avatarUrl', u.avatar_url)) FILTER (WHERE u.id IS NOT NULL), '[]'::json) AS assignees FROM tasks t JOIN statuses s ON s.id=t.status_id JOIN work_types w ON w.id=t.work_type_id LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN memberships m ON m.id=ta.membership_id LEFT JOIN users u ON u.id=m.user_id WHERE t.project_id=$1 AND t.org_id=$2 AND t.deleted_at IS NULL AND ($3::uuid IS NULL OR t.status_id=$3) GROUP BY t.id,s.name,w.name ORDER BY t.due_at NULLS LAST,t.updated_at DESC LIMIT $4 OFFSET $5`, [id, orgId, query.statusId || null, limit, offset]),
    ]);
    const total = Number(taskCountRows[0]?.total || 0);
    return {
      statusCode: 200,
      message: 'Project detail retrieved',
      data: {
        project: projectRows[0],
        summary: summaryRows[0],
        timesheets: timesheetRows[0],
        members,
        tasks: { data: tasks, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } },
      },
    };
  }
  async createProject(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, dto: CreateProjectDto) {
    const ctx = await this.context(user, active, fallback); this.requireAdmin(ctx.accessRole); await this.ensureDefaults(ctx.organization.id); const owner = dto.ownerMembershipId || (await this.membership(ctx.organization.id, user.id)).id; await this.membershipById(ctx.organization.id, owner); const statusId = dto.statusId || await this.defaultStatus(ctx.organization.id, 'PROJECT'); await this.status(ctx.organization.id, statusId, 'PROJECT');
    const project = await this.dataSource.getRepository(Project).save({ orgId: ctx.organization.id, name: dto.name.trim(), description: this.trim(dto.description), ownerMembershipId: owner, statusId, budgetCents: dto.budgetCents ? Number(dto.budgetCents) : undefined, estimateMinutes: dto.estimateMinutes, currency: ctx.organization.currency }); await this.addProjectMembers(project.id, ctx.organization.id, [owner]); return { statusCode: 201, message: 'Project created', data: project };
  }
  async updateProject(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, id: string, dto: UpdateProjectDto) {
    const ctx = await this.context(user, active, fallback); this.requireAdmin(ctx.accessRole); const project = await this.project(ctx.organization.id, id); if (dto.statusId) await this.status(ctx.organization.id, dto.statusId, 'PROJECT'); if (dto.ownerMembershipId) { await this.membershipById(ctx.organization.id, dto.ownerMembershipId); await this.addProjectMembers(id, ctx.organization.id, [dto.ownerMembershipId]); } if (dto.memberMembershipIds) await this.addProjectMembers(id, ctx.organization.id, dto.memberMembershipIds); Object.assign(project, { ...(dto.name !== undefined ? { name: dto.name.trim() } : {}), ...(dto.description !== undefined ? { description: this.trim(dto.description) } : {}), ...(dto.statusId ? { statusId: dto.statusId } : {}), ...(dto.ownerMembershipId ? { ownerMembershipId: dto.ownerMembershipId } : {}), ...(dto.budgetCents !== undefined ? { budgetCents: dto.budgetCents === null ? null : Number(dto.budgetCents) } : {}), ...(dto.estimateMinutes !== undefined ? { estimateMinutes: dto.estimateMinutes } : {}) }); return { statusCode: 200, message: 'Project updated', data: await this.dataSource.getRepository(Project).save(project) };
  }
  async removeProject(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, id: string) { const ctx = await this.context(user, active, fallback); this.requireAdmin(ctx.accessRole); await this.project(ctx.organization.id,id); const taskCount = await this.dataSource.getRepository(Task).count({ where: { orgId:ctx.organization.id, projectId:id } }); if (taskCount) throw new BadRequestException('Delete or move project tasks before deleting this project'); await this.dataSource.getRepository(Project).softDelete({id,orgId:ctx.organization.id}); return {statusCode:200,message:'Project deleted',data:null}; }

  async listTasks(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, query: WorkListQueryDto) { const ctx=await this.context(user,active,fallback); const rows=await this.dataSource.query(`SELECT t.*, p.name AS "projectName", s.name AS "statusName", w.name AS "workTypeName", assigner.full_name AS "assignedByName", assigner.avatar_url AS "assignedByAvatarUrl", COALESCE(array_agg(u.full_name) FILTER (WHERE u.id IS NOT NULL), '{}') AS "assigneeNames", COALESCE(json_agg(json_build_object('membershipId', m.id, 'name', u.full_name, 'avatarUrl', u.avatar_url)) FILTER (WHERE u.id IS NOT NULL), '[]'::json) AS assignees FROM tasks t JOIN projects p ON p.id=t.project_id JOIN statuses s ON s.id=t.status_id JOIN work_types w ON w.id=t.work_type_id LEFT JOIN users assigner ON assigner.id=t.assigned_by LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN memberships m ON m.id=ta.membership_id LEFT JOIN users u ON u.id=m.user_id WHERE t.org_id=$1 AND t.deleted_at IS NULL AND ($2='' OR t.title ILIKE '%' || $2 || '%') AND ($3::uuid IS NULL OR t.project_id=$3) GROUP BY t.id,p.name,s.name,w.name,assigner.full_name,assigner.avatar_url ORDER BY t.due_at NULLS LAST,t.updated_at DESC`,[ctx.organization.id,query.q?.trim()||'',query.projectId||null]); return {statusCode:200,message:'Tasks retrieved',data:rows}; }
  async taskDetail(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, id: string, query: WorkListQueryDto) {
    const ctx = await this.context(user, active, fallback); const page = query.page || 1; const limit = query.limit || 10; const offset = (page - 1) * limit;
    await this.task(ctx.organization.id, id);
    const [tasks, summaryRows, totalRows, entries] = await Promise.all([
      this.dataSource.query(`SELECT t.*, p.name AS "projectName", p.status_id AS "projectStatusId", s.name AS "statusName", w.name AS "workTypeName", assigner.full_name AS "assignedByName", assigner.avatar_url AS "assignedByAvatarUrl", COALESCE(json_agg(json_build_object('membershipId', m.id, 'name', u.full_name, 'avatarUrl', u.avatar_url)) FILTER (WHERE u.id IS NOT NULL), '[]'::json) AS assignees FROM tasks t JOIN projects p ON p.id=t.project_id JOIN statuses s ON s.id=t.status_id JOIN work_types w ON w.id=t.work_type_id LEFT JOIN users assigner ON assigner.id=t.assigned_by LEFT JOIN task_assignees ta ON ta.task_id=t.id LEFT JOIN memberships m ON m.id=ta.membership_id LEFT JOIN users u ON u.id=m.user_id WHERE t.id=$1 AND t.org_id=$2 GROUP BY t.id,p.name,p.status_id,s.name,w.name,assigner.full_name,assigner.avatar_url`, [id, ctx.organization.id]),
      this.dataSource.query(`SELECT COUNT(*)::int AS "entryCount", COALESCE(SUM(minutes),0)::int AS "totalMinutes", COALESCE(SUM(minutes) FILTER (WHERE status='APPROVED'),0)::int AS "approvedMinutes" FROM timesheet_entries WHERE task_id=$1 AND org_id=$2`, [id, ctx.organization.id]),
      this.dataSource.query(`SELECT COUNT(*)::int AS total FROM timesheet_entries WHERE task_id=$1 AND org_id=$2`, [id, ctx.organization.id]),
      this.dataSource.query(`SELECT te.*, m.id AS "membershipId", u.full_name AS "memberName", u.avatar_url AS "memberAvatarUrl", w.name AS "workTypeName" FROM timesheet_entries te JOIN memberships m ON m.id=te.membership_id JOIN users u ON u.id=m.user_id JOIN work_types w ON w.id=te.work_type_id WHERE te.task_id=$1 AND te.org_id=$2 ORDER BY te.work_date DESC,te.created_at DESC LIMIT $3 OFFSET $4`, [id, ctx.organization.id, limit, offset]),
    ]);
    const total = Number(totalRows[0]?.total || 0);
    return { statusCode: 200, message: 'Task detail retrieved', data: { task: tasks[0], summary: summaryRows[0], timesheets: { data: entries, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } } } };
  }
  async createTask(user: AuthenticatedUser, active:string|undefined,fallback:string|undefined,dto:CreateTaskDto) { const ctx=await this.context(user,active,fallback);this.requireAdmin(ctx.accessRole);await this.ensureDefaults(ctx.organization.id);const project=await this.project(ctx.organization.id,dto.projectId);const statusId=dto.statusId||await this.defaultStatus(ctx.organization.id,'TASK');const workTypeId=dto.workTypeId||await this.defaultWorkType(ctx.organization.id);await this.status(ctx.organization.id,statusId,'TASK');await this.workType(ctx.organization.id,workTypeId);const task=await this.dataSource.getRepository(Task).save({orgId:ctx.organization.id,projectId:project.id,title:dto.title.trim(),description:this.trim(dto.description),statusId,workTypeId,priority:dto.priority||0,dueAt:dto.dueAt?new Date(dto.dueAt):undefined,estimateMinutes:dto.estimateMinutes,actualMinutes:0,createdBy:user.id,assignedBy:user.id});const assignees=dto.assigneeMembershipIds?.length?dto.assigneeMembershipIds:[project.ownerMembershipId];await this.addProjectMembers(project.id,ctx.organization.id,assignees);for(const membershipId of assignees) await this.dataSource.getRepository(TaskAssignee).createQueryBuilder().insert().values({taskId:task.id,membershipId}).orIgnore().execute();return {statusCode:201,message:'Task created',data:task}; }
  async updateTask(user:AuthenticatedUser,active:string|undefined,fallback:string|undefined,id:string,dto:UpdateTaskDto){const ctx=await this.context(user,active,fallback);this.requireAdmin(ctx.accessRole);const task=await this.task(ctx.organization.id,id);const projectId=dto.projectId||task.projectId;if(dto.projectId) await this.project(ctx.organization.id,projectId);if(dto.statusId)await this.status(ctx.organization.id,dto.statusId,'TASK');if(dto.workTypeId)await this.workType(ctx.organization.id,dto.workTypeId);Object.assign(task,{...(dto.projectId?{projectId}:{}),...(dto.title!==undefined?{title:dto.title.trim()}:{}),...(dto.description!==undefined?{description:this.trim(dto.description)}:{}),...(dto.statusId?{statusId:dto.statusId}:{}),...(dto.workTypeId?{workTypeId:dto.workTypeId}:{}),...(dto.priority!==undefined?{priority:dto.priority}:{}),...(dto.dueAt!==undefined?{dueAt:dto.dueAt?new Date(dto.dueAt):null}:{}),...(dto.estimateMinutes!==undefined?{estimateMinutes:dto.estimateMinutes}: {}),...(dto.assigneeMembershipIds?{assignedBy:user.id}:{})});await this.dataSource.getRepository(Task).save(task);if(dto.assigneeMembershipIds){await this.addProjectMembers(projectId,ctx.organization.id,dto.assigneeMembershipIds);await this.dataSource.getRepository(TaskAssignee).delete({taskId:id});for(const membershipId of dto.assigneeMembershipIds)await this.dataSource.getRepository(TaskAssignee).save({taskId:id,membershipId});}return {statusCode:200,message:'Task updated',data:task};}
  async removeTask(user:AuthenticatedUser,active:string|undefined,fallback:string|undefined,id:string){const ctx=await this.context(user,active,fallback);this.requireAdmin(ctx.accessRole);await this.task(ctx.organization.id,id);const logs=await this.dataSource.getRepository(TimesheetEntry).count({where:{orgId:ctx.organization.id,taskId:id}});if(logs)throw new BadRequestException('Task has timesheet entries and cannot be deleted');await this.dataSource.getRepository(Task).softDelete({id,orgId:ctx.organization.id});return {statusCode:200,message:'Task deleted',data:null};}

  async listTimesheets(user:AuthenticatedUser,active:string|undefined,fallback:string|undefined,query:WorkListQueryDto){const ctx=await this.context(user,active,fallback);const member=await this.membership(ctx.organization.id,user.id);const rows=await this.dataSource.query(`SELECT te.*, p.name AS "projectName", t.title AS "taskTitle", m.id AS "membershipId", u.full_name AS "memberName", u.avatar_url AS "memberAvatarUrl", w.name AS "workTypeName" FROM timesheet_entries te LEFT JOIN projects p ON p.id=te.project_id LEFT JOIN tasks t ON t.id=te.task_id JOIN memberships m ON m.id=te.membership_id JOIN users u ON u.id=m.user_id JOIN work_types w ON w.id=te.work_type_id WHERE te.org_id=$1 AND ($2::uuid IS NULL OR te.project_id=$2) AND ($3::uuid IS NULL OR te.membership_id=$3) ORDER BY te.work_date DESC,te.created_at DESC`,[ctx.organization.id,query.projectId||null,this.isAdmin(ctx.accessRole)?null:member.id]);return {statusCode:200,message:'Timesheets retrieved',data:rows};}
  async timesheetDetail(user: AuthenticatedUser, active: string | undefined, fallback: string | undefined, id: string) {
    const ctx = await this.context(user, active, fallback); const member = await this.membership(ctx.organization.id, user.id);
    const rows = await this.dataSource.query(`SELECT te.*, p.name AS "projectName", p.description AS "projectDescription", t.title AS "taskTitle", t.description AS "taskDescription", t.estimate_minutes AS "taskEstimateMinutes", t.actual_minutes AS "taskActualMinutes", m.id AS "membershipId", u.full_name AS "memberName", u.email AS "memberEmail", u.avatar_url AS "memberAvatarUrl", w.name AS "workTypeName" FROM timesheet_entries te LEFT JOIN projects p ON p.id=te.project_id LEFT JOIN tasks t ON t.id=te.task_id JOIN memberships m ON m.id=te.membership_id JOIN users u ON u.id=m.user_id JOIN work_types w ON w.id=te.work_type_id WHERE te.id=$1 AND te.org_id=$2 AND ($3::boolean OR te.membership_id=$4)`, [id, ctx.organization.id, this.isAdmin(ctx.accessRole), member.id]);
    if (!rows[0]) throw new NotFoundException('Timesheet entry not found');
    return { statusCode: 200, message: 'Timesheet detail retrieved', data: rows[0] };
  }
  async createTimesheet(user:AuthenticatedUser,active:string|undefined,fallback:string|undefined,dto:CreateTimesheetDto){const ctx=await this.context(user,active,fallback);await this.ensureDefaults(ctx.organization.id);const currentMember=await this.membership(ctx.organization.id,user.id);const memberId=dto.membershipId&&this.isAdmin(ctx.accessRole)?dto.membershipId:currentMember.id;if(dto.membershipId&&!this.isAdmin(ctx.accessRole)&&dto.membershipId!==currentMember.id)throw new ForbiddenException('Members can only log their own time');await this.membershipById(ctx.organization.id,memberId);const projectId=dto.projectId;const taskId=dto.taskId;if(!projectId)throw new BadRequestException('Select a project first');if(!taskId)throw new BadRequestException('Select a task after choosing the project');await this.project(ctx.organization.id,projectId);const task=await this.task(ctx.organization.id,taskId);if(projectId!==task.projectId)throw new BadRequestException('Timesheet task must belong to its selected project');const assigned=await this.dataSource.getRepository(TaskAssignee).count({where:{taskId,membershipId:memberId}});if(!assigned)throw new ForbiddenException('Timesheet member must be assigned to the selected task');const workTypeId=dto.workTypeId||await this.defaultWorkType(ctx.organization.id);await this.workType(ctx.organization.id,workTypeId);const entry=await this.dataSource.getRepository(TimesheetEntry).save({orgId:ctx.organization.id,membershipId:memberId,projectId,taskId,workTypeId,minutes:dto.minutes,workDate:dto.workDate,description:this.trim(dto.description),status:'SUBMITTED'});await this.recalculateTaskMinutes(taskId);return {statusCode:201,message:'Timesheet submitted',data:entry};}
  async removeTimesheet(user:AuthenticatedUser,active:string|undefined,fallback:string|undefined,id:string){const ctx=await this.context(user,active,fallback);const member=await this.membership(ctx.organization.id,user.id);const entry=await this.dataSource.getRepository(TimesheetEntry).findOne({where:{id,orgId:ctx.organization.id}});if(!entry)throw new NotFoundException('Timesheet not found');if(!this.isAdmin(ctx.accessRole)&&entry.membershipId!==member.id)throw new ForbiddenException('You can only delete your own timesheet');if(entry.status==='APPROVED')throw new BadRequestException('Approved timesheets cannot be deleted');await this.dataSource.getRepository(TimesheetEntry).delete(id);if(entry.taskId)await this.recalculateTaskMinutes(entry.taskId);return {statusCode:200,message:'Timesheet deleted',data:null};}
  private async membershipById(orgId:string,id:string){const m=await this.dataSource.getRepository(Membership).findOne({where:{id,orgId,status:1}});if(!m)throw new BadRequestException('Invalid organization member');return m;}
}
