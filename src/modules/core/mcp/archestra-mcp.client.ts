import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type McpClientCtor = any;
type StreamableHTTPClientTransportCtor = any;

@Injectable()
export class ArchestraMcpClient {
  private client: any | null = null;
  private transport: any | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  private async loadSdk(): Promise<{
    Client: McpClientCtor;
    StreamableHTTPClientTransport: StreamableHTTPClientTransportCtor;
  }> {
    // ép Node dùng native dynamic import thay vì CJS require
    const dynamicImport = new Function(
      'specifier',
      'return import(specifier)',
    ) as (specifier: string) => Promise<any>;

    const pkg = await dynamicImport('@modelcontextprotocol/client');

    return {
      Client: pkg.Client,
      StreamableHTTPClientTransport: pkg.StreamableHTTPClientTransport,
    };
  }

  private async connect() {
    if (this.isConnected) return;

    const gatewayUrl = this.configService.getOrThrow<string>(
      'ARCHESTRA_MCP_GATEWAY_URL',
    );
    const gatewayToken = this.configService.getOrThrow<string>(
      'ARCHESTRA_MCP_TOKEN',
    );

    const { Client, StreamableHTTPClientTransport } = await this.loadSdk();

    const authProvider = {
      token: async () => gatewayToken,
    };

    this.transport = new StreamableHTTPClientTransport(new URL(gatewayUrl), {
      authProvider,
    });

    this.client = new Client({
      name: 'finance-crm-backend',
      version: '0.1.0',
    });

    await this.client.connect(this.transport);
    this.isConnected = true;
  }

  async listTools() {
    await this.connect();
    return this.client.listTools();
  }

  async callTool(name: string, args: Record<string, unknown>) {
    await this.connect();
    return this.client.callTool({
      name,
      arguments: args,
    });
  }

  getGatewayConfig() {
    return {
      gatewayId:
        this.configService.get<string>('ARCHESTRA_MCP_GATEWAY_ID') ?? null,
      gatewayUrl: this.configService.getOrThrow<string>(
        'ARCHESTRA_MCP_GATEWAY_URL',
      ),
      timeoutMs: Number(
        this.configService.get<string>('ARCHESTRA_TIMEOUT_MS') ?? 30000,
      ),
    };
  }
}
