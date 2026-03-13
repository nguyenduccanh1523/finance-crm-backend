import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonalWorkspace } from '../entities/personal-workspace.entity';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class PersonalWorkspaceService {
  constructor(
    @InjectRepository(PersonalWorkspace)
    private readonly wsRepo: Repository<PersonalWorkspace>,
  ) {}

  async getOrCreateByUserId(userId: string) {
    let ws = await this.wsRepo.findOne({ where: { userId } });
    if (!ws) {
      ws = this.wsRepo.create({
        userId,
        name: 'My Workspace',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultCurrency: 'VND',
      });
      ws = await this.wsRepo.save(ws);
    }
    return ws;
  }

  async getWorkspaceIdByUserId(userId: string): Promise<string> {
    const ws = await this.getOrCreateByUserId(userId);
    return ws.id;
  }

  async findById(workspaceId: string) {
    return this.wsRepo.findOne({ where: { id: workspaceId } });
  }

  async updateWorkspace(userId: string, dto: UpdateWorkspaceDto) {
    const ws = await this.wsRepo.findOne({ where: { userId } });
    if (!ws) {
      throw new Error('Workspace not found');
    }

    if (dto.name) ws.name = dto.name;
    if (dto.timezone) ws.timezone = dto.timezone;
    if (dto.defaultCurrency) ws.defaultCurrency = dto.defaultCurrency;

    return await this.wsRepo.save(ws);
  }
}
