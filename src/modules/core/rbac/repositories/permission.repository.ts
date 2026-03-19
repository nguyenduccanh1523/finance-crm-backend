import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../permission.entity';
import { CreatePermissionDto } from '../dto/create-permission.dto';

/**
 * PermissionRepository - Chỉ handle Permission CRUD operations
 */
@Injectable()
export class PermissionRepository {
  constructor(
    @InjectRepository(Permission)
    private readonly typeormRepo: Repository<Permission>,
  ) {}

  async create(dto: CreatePermissionDto): Promise<Permission> {
    const perm = this.typeormRepo.create(dto);
    return this.typeormRepo.save(perm);
  }

  async findAll(): Promise<Permission[]> {
    return this.typeormRepo.find();
  }

  async findById(id: string): Promise<Permission | null> {
    return this.typeormRepo.findOne({ where: { id } });
  }

  async findByIdOrThrow(id: string): Promise<Permission> {
    const perm = await this.findById(id);
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  async findByCode(code: string): Promise<Permission | null> {
    return this.typeormRepo.findOne({ where: { code } });
  }

  async findByModule(module: string): Promise<Permission[]> {
    return this.typeormRepo.find({ where: { module } });
  }

  async findByIds(ids: string[]): Promise<Permission[]> {
    if (!ids.length) return [];
    return this.typeormRepo.find({
      where: { id: ids as any },
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.typeormRepo.delete(id);
    return !!result.affected;
  }
}
