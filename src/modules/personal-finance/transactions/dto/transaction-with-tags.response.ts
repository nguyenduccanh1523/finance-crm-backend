export class TagDto {
  id: string;
  name: string;
  color?: string;
}

export class TransactionWithTagsResponseDto {
  id: string;
  workspaceId: string;
  accountId: string;
  type: string;
  amountCents: number;
  currency: string;
  occurredAt: Date;
  categoryId?: string;
  note?: string;
  counterparty?: string;
  transferAccountId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  // Tags info
  tags?: TagDto[];
}
