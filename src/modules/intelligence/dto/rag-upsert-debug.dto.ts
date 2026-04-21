import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class RagKnowledgeDocumentDto {
  @IsString()
  @IsNotEmpty()
  source_type!: string;

  @IsString()
  @IsNotEmpty()
  source_ref!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  @IsNotEmpty()
  text!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RagUpsertDebugDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RagKnowledgeDocumentDto)
  documents!: RagKnowledgeDocumentDto[];
}
