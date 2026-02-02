import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalWorkspace } from '../entities/personal-workspace.entity';

@Injectable()
export class PersonalWorkspaceService {
  constructor(
    @InjectRepository(PersonalWorkspace)
    private readonly wsRepo: Repository<PersonalWorkspace>,
  ) {}

  async getOrCreateByUserId(userId: string) {
    let ws = await this.wsRepo.findOne({ where: { userId } });
    if (!ws) {
      ws = this.wsRepo.create({ userId });
      ws = await this.wsRepo.save(ws);
    }
    return ws;
  }

  async getWorkspaceIdByUserId(userId: string): Promise<string> {
    const ws = await this.getOrCreateByUserId(userId);
    return ws.id;
  }
}
