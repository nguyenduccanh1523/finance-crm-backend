import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Membership } from '../membership.entity';
import { AssignMembershipDto } from '../dto/assign-membership.dto';

/**
 * MembershipRepository - Handle user-organization-role associations
 */
@Injectable()
export class MembershipRepository {
  constructor(
    @InjectRepository(Membership)
    private readonly typeormRepo: Repository<Membership>,
  ) {}

  async create(dto: AssignMembershipDto): Promise<Membership> {
    const membership = this.typeormRepo.create(dto);
    return this.typeormRepo.save(membership);
  }

  async findByUserAndOrg(
    userId: string,
    orgId: string,
  ): Promise<Membership | null> {
    return this.typeormRepo.findOne({
      where: { userId, orgId },
      relations: ['role'],
    });
  }

  async findByUserAndRole(
    userId: string,
    roleId: string,
  ): Promise<Membership | null> {
    return this.typeormRepo.findOne({
      where: { userId, roleId },
    });
  }

  async findByUser(userId: string): Promise<Membership[]> {
    return this.typeormRepo.find({
      where: { userId },
      relations: ['role', 'organization'],
    });
  }

  async findByOrg(orgId: string): Promise<Membership[]> {
    return this.typeormRepo.find({
      where: { orgId },
      relations: ['user', 'role'],
    });
  }

  async findByRole(roleId: string): Promise<Membership[]> {
    return this.typeormRepo.find({
      where: { roleId },
      relations: ['user'],
    });
  }

  async findUsersByRole(roleId: string): Promise<string[]> {
    const memberships = await this.typeormRepo.find({
      where: { roleId },
      select: ['userId'],
    });
    return memberships.map((m) => m.userId);
  }

  async update(
    id: string,
    data: Partial<Membership>,
  ): Promise<Membership | null> {
    await this.typeormRepo.update(id, data);
    return this.typeormRepo.findOne({ where: { id } });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.typeormRepo.delete(id);
    return !!result.affected;
  }

  async deleteByUserAndOrg(userId: string, orgId: string): Promise<boolean> {
    const result = await this.typeormRepo.delete({ userId, orgId });
    return !!result.affected;
  }

  async count(userId: string): Promise<number> {
    return this.typeormRepo.count({ where: { userId } });
  }

  async existsMembership(userId: string, orgId: string): Promise<boolean> {
    const count = await this.typeormRepo.count({
      where: { userId, orgId },
    });
    return count > 0;
  }
}
