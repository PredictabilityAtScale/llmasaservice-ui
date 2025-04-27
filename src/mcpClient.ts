import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/*
reference: https://github.com/cyanheads/model-context-protocol-resources/blob/main/guides/mcp-client-development-guide.md
*/

export class MCPClient {
  private client: Client;
  private transport: SSEClientTransport | StreamableHTTPClientTransport;
  private headers: [];
  public tools: any[] = [];

  constructor(name: string, transport: string, url: string, headers: [] = []) {
    switch (transport.toLowerCase()) {
      case "sse":
        this.transport = new SSEClientTransport(new URL(url));
        break;
      case "http":
        this.transport = new StreamableHTTPClientTransport(new URL(url));
        break;
      default:
        this.transport = new StreamableHTTPClientTransport(new URL(url));
    }

    this.client = new Client(
      {
        name: name,
        version: "1.0.0",
      },
      { capabilities: { tools: {}, resources: {}, prompts: {} } }
    );

    this.headers = headers;
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async disconnect() {
    await this.client.close();
  }

  async listTools() {
    const result = await this.client.listTools();
    this.tools = Array.isArray(result) ? result : (result as any).tools ?? [];
    return this.tools;
  }

  getNormalizedTools() {
    const formattedTools: any[] = [];
    this.tools.forEach((t: any) =>
      formattedTools.push({
        name: t.name,
        description: t.description || `Tool: ${t.name}`,
        input_schema: t.inputSchema,
      })
    );

    return formattedTools;
  }

  toolExists(name: string) {
    return this.tools.some((tool) => tool.name === name);
  }

  async listPrompts() {
    return await this.client.listPrompts();
  }

  async getPrompt(name: string, args: Record<string, string>) {
    return await this.client.getPrompt({
      name,
      arguments: args,
    });
  }

  async listResources() {
    return await this.client.listResources();
  }

  async readResource(uri: string) {
    return await this.client.readResource({
      uri,
    });
  }

  async callTool(name: string, args: Record<string, unknown>) {
    return await this.client.callTool({
      name,
      arguments: args,
    });
  }
}
