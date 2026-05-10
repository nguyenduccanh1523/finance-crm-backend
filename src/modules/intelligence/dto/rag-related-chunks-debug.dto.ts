import { IsArray, IsNotEmpty, IsString } from 'class-validator';

export class RagRelatedChunkDebugDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsArray()
  @IsString({ each: true })
  chunkIds!: string[];
}
