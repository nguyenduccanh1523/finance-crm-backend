export class TagResponseDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  color?: string;
  scope: 'global' | 'workspace';
  createdAt: Date;
  updatedAt: Date;
}

export class ListTagsResponseDto {
  global: TagResponseDto[];
  workspace: TagResponseDto[];
}
