import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleScope } from '../../../../common/enums/role-scope.enum';

export class CreateRoleDto {
  @IsEnum(RoleScope)
  scope: RoleScope;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
