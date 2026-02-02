import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/core/auth/decorators/current-user.decorator';
import { PersonalWorkspaceService } from './personal-workspace.service';

@UseGuards(JwtAuthGuard)
@Controller('personal/workspace')
export class PersonalWorkspaceController {
  constructor(private readonly wsService: PersonalWorkspaceService) {}

  @Get('me')
  async getMe(@CurrentUser() user: any) {
    return this.wsService.getOrCreateByUserId(user.id);
  }
}
