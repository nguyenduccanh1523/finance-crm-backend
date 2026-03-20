import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalWorkspace } from '../entities/personal-workspace.entity';

@Injectable()
export class PersonalWorkspaceRepository {
  constructor(
    @InjectRepository(PersonalWorkspace)
    private readonly wsRepo: Repository<PersonalWorkspace>,
  ) {}

  async findByUserId(userId: string) {
    return this.wsRepo.findOne({ where: { userId } });
  }

  async findById(id: string) {
    return this.wsRepo.findOne({ where: { id } });
  }

  create(data: any): PersonalWorkspace {
    return this.wsRepo.create(data) as any;
  }

  async save(entity: PersonalWorkspace): Promise<PersonalWorkspace> {
    return this.wsRepo.save(entity);
  }
}
