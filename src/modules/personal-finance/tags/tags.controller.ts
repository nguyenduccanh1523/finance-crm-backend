import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/core/auth/decorators/current-user.decorator';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';

@UseGuards(JwtAuthGuard)
@Controller('personal/tags')
export class TagsController {
  constructor(private readonly service: TagsService) {}

  @Get()
  list(@CurrentUser() user: any) {
    return this.service.list(user);
  }

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateTagDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateTagDto,
  ) {
    return this.service.update(user, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.service.remove(user, id);
  }
}
