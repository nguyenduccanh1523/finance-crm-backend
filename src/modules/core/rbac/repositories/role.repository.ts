import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../role.entity';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RoleScope } from '../../../../common/enums/role-scope.enum';

/**
 * RoleRepository - Chỉ handle Role CRUD operations
 * Nguyên tắc Single Responsibility: Chỉ làm việc với Role entity
 */
@Injectable()
export class RoleRepository {
  constructor(
    @InjectRepository(Role)
    private readonly typeormRepo: Repository<Role>,
  ) {}

  async create(dto: CreateRoleDto): Promise<Role> {
    const role = this.typeormRepo.create(dto);
    return this.typeormRepo.save(role);
  }

  async findAll(): Promise<Role[]> {
    return this.typeormRepo.find();
  }

  async findById(id: string): Promise<Role | null> {
    return this.typeormRepo.findOne({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Role> {
    const role = await this.findById(id);
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async findByNameAndScope(
    name: string,
    scope: RoleScope,
    orgId?: string,
  ): Promise<Role | null> {
    const where: any = { scope, name };
    if (scope === RoleScope.ORG) {
      where.orgId = orgId;
    }
    return this.typeormRepo.findOne({ where });
  }

  async findGlobalRoleByName(name: string): Promise<Role | null> {
    return this.typeormRepo.findOne({
      where: { scope: RoleScope.GLOBAL, name },
    });
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findByIdOrThrow(id);
    Object.assign(role, dto);
    return this.typeormRepo.save(role);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.typeormRepo.delete(id);
    return !!result.affected;
  }

  async findByScope(scope: RoleScope): Promise<Role[]> {
    return this.typeormRepo.find({ where: { scope } });
  }

  async findGlobalRoles(): Promise<Role[]> {
    return this.findByScope(RoleScope.GLOBAL);
  }

  async findOrgRoles(orgId: string): Promise<Role[]> {
    return this.typeormRepo.find({
      where: { scope: RoleScope.ORG, orgId },
    });
  }
}
