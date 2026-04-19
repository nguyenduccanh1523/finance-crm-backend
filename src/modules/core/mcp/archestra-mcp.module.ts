import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ArchestraMcpClient } from './archestra-mcp.client';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [ArchestraMcpClient],
  exports: [ArchestraMcpClient],
})
export class ArchestraMcpModule {}
