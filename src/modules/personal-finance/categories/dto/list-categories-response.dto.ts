export class CategoryResponseDto {
  id: string;
  workspaceId?: string | null;
  name: string;
  kind: string;
  icon?: string;
  parentId?: string;
  sortOrder: number;
  scope: 'global' | 'workspace';
  createdAt: Date;
  updatedAt: Date;
}

export class ListCategoriesResponseDto {
  global: CategoryResponseDto[];
  workspace: CategoryResponseDto[];
}
