import { Body, Controller, Delete, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../core/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../../core/organizations/organization-context.service';
import { CreateProjectDto, CreateTaskDto, CreateTimesheetDto, UpdateProjectDto, UpdateTaskDto, WorkListQueryDto } from './dto/work-management.dto';
import { WorkManagementService } from './work-management.service';

@ApiTags('Work management') @ApiCookieAuth('access_token') @ApiHeader({ name:'x-org-id', required:false, description:'Optional API-client fallback. Browser uses active_org_id cookie.' }) @UseGuards(JwtAuthGuard) @Controller('business/work-management')
export class WorkManagementController {
  constructor(private readonly service: WorkManagementService) {}
  private args(req:Request, fallback:string|undefined){ return [req.cookies?.active_org_id, fallback] as const; }
  @Get('metadata') @ApiOperation({summary:'Workflow metadata and valid linked selectors'}) metadata(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f?:string){const[a,b]=this.args(r,f);return this.service.metadata(u,a,b)}
  @Get('projects') projects(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Query()q:WorkListQueryDto){const[a,b]=this.args(r,f);return this.service.listProjects(u,a,b,q)}
  @Get('projects/:id/detail') @ApiOperation({summary:'Project overview with paginated tasks and timesheet totals'}) projectDetail(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string,@Query()q:WorkListQueryDto){const[a,b]=this.args(r,f);return this.service.projectDetail(u,a,b,id,q)}
  @Post('projects') createProject(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Body()d:CreateProjectDto){const[a,b]=this.args(r,f);return this.service.createProject(u,a,b,d)}
  @Patch('projects/:id') updateProject(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string,@Body()d:UpdateProjectDto){const[a,b]=this.args(r,f);return this.service.updateProject(u,a,b,id,d)}
  @Delete('projects/:id') removeProject(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string){const[a,b]=this.args(r,f);return this.service.removeProject(u,a,b,id)}
  @Get('tasks') tasks(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Query()q:WorkListQueryDto){const[a,b]=this.args(r,f);return this.service.listTasks(u,a,b,q)}
  @Get('tasks/:id/detail') @ApiOperation({summary:'Task overview with assignees and timesheet history'}) taskDetail(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string,@Query()q:WorkListQueryDto){const[a,b]=this.args(r,f);return this.service.taskDetail(u,a,b,id,q)}
  @Post('tasks') createTask(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Body()d:CreateTaskDto){const[a,b]=this.args(r,f);return this.service.createTask(u,a,b,d)}
  @Patch('tasks/:id') updateTask(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string,@Body()d:UpdateTaskDto){const[a,b]=this.args(r,f);return this.service.updateTask(u,a,b,id,d)}
  @Delete('tasks/:id') removeTask(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string){const[a,b]=this.args(r,f);return this.service.removeTask(u,a,b,id)}
  @Get('timesheets') timesheets(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Query()q:WorkListQueryDto){const[a,b]=this.args(r,f);return this.service.listTimesheets(u,a,b,q)}
  @Get('timesheets/:id/detail') @ApiOperation({summary:'Timesheet detail with linked task and project'}) timesheetDetail(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string){const[a,b]=this.args(r,f);return this.service.timesheetDetail(u,a,b,id)}
  @Post('timesheets') createTimesheet(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Body()d:CreateTimesheetDto){const[a,b]=this.args(r,f);return this.service.createTimesheet(u,a,b,d)}
  @Delete('timesheets/:id') removeTimesheet(@CurrentUser()u:AuthenticatedUser,@Req()r:Request,@Headers('x-org-id')f:string|undefined,@Param('id',ParseUUIDPipe)id:string){const[a,b]=this.args(r,f);return this.service.removeTimesheet(u,a,b,id)}
}
