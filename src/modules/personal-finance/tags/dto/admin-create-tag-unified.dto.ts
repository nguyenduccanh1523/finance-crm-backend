import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

type AdminTagScope = 'global' | 'workspace' | 'user';

export class AdminCreateTagDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsEnum(['global', 'workspace', 'user'])
  scope: AdminTagScope;

  // For workspace or user scope
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;
}
