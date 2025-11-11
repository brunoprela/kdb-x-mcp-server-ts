import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { Logger } from './utils/logging.js';
import type { AppSettings } from './settings.js';
import { getKDBConnection } from './utils/kdbx.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';
import { preloadModelsFromConfig } from './utils/embeddings.js';
import * as net from 'net';

let aiLibsAvailable = false;

export function setAiLibsAvailable(available: boolean): void {
  aiLibsAvailable = available;
}

export function isAiLibsAvailable(): boolean {
  return aiLibsAvailable;
}

export class KdbxMcpServer {
  private mcpServer: McpServer;
  private logger: Logger;
  private config: AppSettings;

  constructor(config: AppSettings, logger: Logger) {
    this.config = config;
    this.logger = logger;

    this.logger.info(`KDBConfig: ${JSON.stringify(this.config.db)}`);
    this.logger.info(`ServerConfig: ${JSON.stringify(this.config.mcp)}`);

    // Initialize MCP server using the SDK's McpServer class
    this.mcpServer = new McpServer(
      {
        name: this.config.mcp.serverName,
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    // Note: checkPortAvailability and checkKDBConnection are called in run() method
    this.registerHandlers();
    if (isAiLibsAvailable()) {
      this.preloadEmbeddingModels();
    }
  }

  private async checkPortAvailability(): Promise<void> {
    if (this.config.mcp.transport === 'streamable-http') {
      return new Promise<void>((resolve, reject) => {
        const server = net.createServer();
        server.listen(this.config.mcp.port, this.config.mcp.host, () => {
          server.close(() => {
            this.logger.info(
              `KDB-X MCP port availability check: SUCCESS - ${this.config.mcp.host}:${this.config.mcp.port} is available`
            );
            resolve();
          });
        });
        server.on('error', (err: NodeJS.ErrnoException) => {
          if (err.code === 'EADDRINUSE') {
            this.logger.error(
              `KDB-X MCP port ${this.config.mcp.port} is already in use on ${this.config.mcp.host}`
            );
            this.logger.error('Solutions:');
            this.logger.error(`  - Try a different port: --mcp.port ${this.config.mcp.port + 1}`);
            this.logger.error(`  - Stop the service using port ${this.config.mcp.port}`);
            reject(err);
          } else {
            reject(err);
          }
        });
      });
    }
  }

  private async checkKDBConnection(): Promise<void> {
    try {
      const conn = await getKDBConnection(this.config.db, this.logger);

      // Try to get kdbx version first, fall back to kdb+ version
      let kdbVersion: string;
      let kdbType: string;
      try {
        kdbVersion = await conn.query('.z.v`version');
        kdbType = 'KDB-X';
      } catch {
        kdbVersion = String(await conn.query('.z.K'));
        kdbType = 'KDB+';
      }

      this.logger.info(
        `KDB-X connectivity check with 'tls=${this.config.db.tls}': SUCCESS - ${this.config.db.host}:${this.config.db.port} is accessible. You are running ${kdbType} version: ${kdbVersion}`
      );

      // Check if SQL interface is loaded
      const sqlInterfaceLoaded = await conn.query('@[{2< count .s};(::);{0b}]');
      if (!sqlInterfaceLoaded) {
        this.logger.error(
          'KDB-X SQL interface check: FAILED - KDB-X service does not have the SQL interface loaded. Load it by running .s.init[] in your KDB-X Session'
        );
        process.exit(1);
      } else {
        this.logger.info('KDB-X SQL interface check: SUCCESS - SQL interface is loaded');
      }

      // Check if AI libs are loaded
      const aiLibsLoaded = await conn.query('@[{2< count .ai};(::);{0b}]');
      if (!aiLibsLoaded) {
        // Check KDB-X version
        if (kdbType === 'KDB-X') {
          const versionMatch = kdbVersion.match(/(\d+\.\d+\.\d+)/);
          if (versionMatch && versionMatch[1] < '0.1.2') {
            this.logger.warning(
              'KDB-X AI Libs check: NOT AVAILABLE - AI-powered tools (similarity_search, hybrid_search) will be disabled.'
            );
            this.logger.warning(
              `To use AI tools, you need at least KDB-X version '0.1.2'. Your version is '${kdbVersion}'. Please update to the latest KDB-X version.`
            );
          } else {
            this.logger.warning(
              'KDB-X AI Libs check: NOT LOADED - AI-powered tools (similarity_search, hybrid_search) will be disabled.'
            );
            this.logger.warning(
              "To enable AI tools, load the KDB-X AI libraries by running: .ai:use`kx.ai in your KDB-X Session and then restart the MCP server"
            );
          }
        } else {
          this.logger.warning(
            'KDB-X AI Libs check: NOT AVAILABLE - AI-powered tools (similarity_search, hybrid_search) are only available in KDB-X.'
          );
        }
      } else {
        this.logger.info(
          'KDB-X AI Libs check: SUCCESS - AI Libs are loaded, AI tools will be available'
        );
        setAiLibsAvailable(true);
      }
    } catch (e: any) {
      this.logger.error(
        `KDB-X connectivity check with 'tls=${this.config.db.tls}': FAILED - ${this.config.db.host}:${this.config.db.port} (${e})`
      );

      if (e.message && e.message.includes('Connection refused')) {
        this.logger.error(
          `Verify KDB-X service is running and accessible on ${this.config.db.host}:${this.config.db.port}`
        );
      }

      if (e.message && e.message.includes('invalid username/password')) {
        this.logger.error('Verify your KDBX_DB_USERNAME and KDBX_DB_PASSWORD are correct');
      }

      this.logger.error(
        'KDB-X MCP server cannot function without connection to a KDB-X database. Exiting...'
      );
      process.exit(1);
    }
  }

  private registerHandlers(): void {
    registerTools(this.mcpServer, this.config.db, this.logger, isAiLibsAvailable());
    registerResources(this.mcpServer, this.config.db, this.logger);
    registerPrompts(this.mcpServer, this.logger);
  }

  private async preloadEmbeddingModels(): Promise<void> {
    try {
      await preloadModelsFromConfig(this.config.db.embeddingCsvPath, this.logger);
      this.logger.info('Embedding models preloaded successfully');
    } catch (e) {
      this.logger.warning(`Failed to preload embedding models: ${e}`);
      this.logger.warning('Models will be loaded on first use, which may cause delays');
    }
  }

  async run(): Promise<void> {
    try {
      await this.checkPortAvailability();
      await this.checkKDBConnection();

      this.logger.info(
        `Starting ${this.config.mcp.serverName} MCP Server with ${this.config.mcp.transport} transport`
      );

      if (this.config.mcp.transport === 'stdio') {
        const transport = new StdioServerTransport();
        await this.mcpServer.connect(transport);
        this.logger.info('Server running on stdio transport');
      } else if (this.config.mcp.transport === 'streamable-http') {
        // For streamable-http, we need to set up an HTTP server
        // The MCP SDK should handle this, but we may need to implement it
        this.logger.warning(
          'Streamable-HTTP transport is not yet fully implemented in this TypeScript version. Please use stdio transport for now.'
        );
        const transport = new StdioServerTransport();
        await this.mcpServer.connect(transport);
      } else {
        throw new Error(`Unsupported transport: ${this.config.mcp.transport}`);
      }
    } catch (e) {
      this.logger.error(`Server error: ${e}`);
      throw e;
    }
  }
}

