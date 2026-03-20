import { Injectable } from '@nestjs/common';
import { PersonalWorkspaceRepository } from './personal-workspace.repository';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Injectable()
export class PersonalWorkspaceService {
  constructor(private readonly repo: PersonalWorkspaceRepository) {}

  async getOrCreateByUserId(userId: string) {
    let ws = await this.repo.findByUserId(userId);
    if (!ws) {
      ws = this.repo.create({
        userId,
        name: 'My Workspace',
        timezone: 'Asia/Ho_Chi_Minh',
        defaultCurrency: 'VND',
      });
      ws = await this.repo.save(ws);
    }
    return ws;
  }

  async getWorkspaceIdByUserId(userId: string): Promise<string> {
    const ws = await this.getOrCreateByUserId(userId);
    return ws.id;
  }

  async findById(workspaceId: string) {
    return this.repo.findById(workspaceId);
  }

  async updateWorkspace(userId: string, dto: UpdateWorkspaceDto) {
    const ws = await this.repo.findByUserId(userId);
    if (!ws) {
      throw new Error('Workspace not found');
    }

    if (dto.name) ws.name = dto.name;
    if (dto.timezone) ws.timezone = dto.timezone;
    if (dto.defaultCurrency) ws.defaultCurrency = dto.defaultCurrency;

    return await this.repo.save(ws);
  }
}
