import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { RbacService } from './rbac.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { AssignRolePermissionDto } from './dto/assign-role-permission.dto';
import { AssignMembershipDto } from './dto/assign-membership.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UseGuards } from '@nestjs/common';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN') // chỉ SUPER_ADMIN mới quản được RBAC
@Controller('rbac')
export class RbacAdminController {
  constructor(private readonly rbacService: RbacService) {}

  // ROLE
  @Post('roles')
  createRole(@Body() dto: CreateRoleDto) {
    return this.rbacService.createRole(dto);
  }

  @Get('roles')
  listRoles() {
    return this.rbacService.listRoles();
  }

  @Put('roles/:id')
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rbacService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  deleteRole(@Param('id') id: string) {
    return this.rbacService.deleteRole(id);
  }

  // PERMISSION
  @Post('permissions')
  createPermission(@Body() dto: CreatePermissionDto) {
    return this.rbacService.createPermission(dto);
  }

  @Get('permissions')
  listPermissions() {
    return this.rbacService.listPermissions();
  }

  // ROLE_PERMISSION
  @Post('role-permissions')
  assignRolePermission(@Body() dto: AssignRolePermissionDto) {
    return this.rbacService.assignRolePermission(dto);
  }

  @Delete('role-permissions')
  removeRolePermission(@Body() dto: AssignRolePermissionDto) {
    return this.rbacService.removeRolePermission(dto);
  }

  // MEMBERSHIP
  @Post('memberships')
  assignMembership(@Body() dto: AssignMembershipDto) {
    return this.rbacService.assignMembership(dto);
  }

  @Get('memberships/user/:userId')
  listMemberships(@Param('userId') userId: string) {
    return this.rbacService.listMembershipsByUser(userId);
  }
}
