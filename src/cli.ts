#!/usr/bin/env node

import { Command } from 'commander';
import { loadAppSettings, type AppSettings } from './settings.js';
import { setupLogging } from './utils/logging.js';
import { KdbxMcpServer } from './server.js';

const program = new Command();

program
  .name('mcp-server')
  .description('KDB-X MCP Server that enables interaction with KDB-X using natural language')
  .version('0.1.0');

// MCP options
program
  .option('--mcp.server-name <name>', 'Name identifier for the MCP server instance', process.env.KDBX_MCP_SERVER_NAME)
  .option('--mcp.log-level <level>', 'Logging verbosity level', process.env.KDBX_MCP_LOG_LEVEL || 'INFO')
  .option('--mcp.transport <transport>', "Communication protocol: 'stdio' or 'streamable-http'", process.env.KDBX_MCP_TRANSPORT || 'streamable-http')
  .option('--mcp.port <port>', 'HTTP server port - ignored when using stdio transport', process.env.KDBX_MCP_PORT || '8000')
  .option('--mcp.host <host>', 'HTTP server bind address - ignored when using stdio transport', process.env.KDBX_MCP_HOST || '127.0.0.1');

// Database options
program
  .option('--db.host <host>', 'KDB-X server hostname or IP address', process.env.KDBX_DB_HOST || '127.0.0.1')
  .option('--db.port <port>', 'KDB-X server port number', process.env.KDBX_DB_PORT || '5000')
  .option('--db.username <username>', 'Username for KDB-X authentication', process.env.KDBX_DB_USERNAME || '')
  .option('--db.password <password>', 'Password for KDB-X authentication', process.env.KDBX_DB_PASSWORD || '')
  .option('--db.tls <tls>', 'Enable TLS for KDB-X connections', process.env.KDBX_DB_TLS === 'true')
  .option('--db.timeout <timeout>', 'Timeout in seconds for KDB-X connection attempts', process.env.KDBX_DB_TIMEOUT || '1')
  .option('--db.retry <retry>', 'Number of connection retry attempts on failure', process.env.KDBX_DB_RETRY || '2')
  .option('--db.embedding-csv-path <path>', 'Path to embeddings csv', process.env.KDBX_DB_EMBEDDING_CSV_PATH)
  .option('--db.metric <metric>', 'Distance metric used for vector similarity search', process.env.KDBX_DB_METRIC || 'CS')
  .option('--db.k <k>', 'Default number of results to return from vector searches', process.env.KDBX_DB_K || '5');

program.parse();

const options = program.opts();

// Merge CLI options with environment/config
const baseSettings = loadAppSettings();

const settings: AppSettings = {
  mcp: {
    serverName: options.mcpServerName || baseSettings.mcp.serverName,
    logLevel: (options.mcpLogLevel as any) || baseSettings.mcp.logLevel,
    transport: (options.mcpTransport as any) || baseSettings.mcp.transport,
    port: parseInt(options.mcpPort || String(baseSettings.mcp.port), 10),
    host: options.mcpHost || baseSettings.mcp.host,
  },
  db: {
    host: options.dbHost || baseSettings.db.host,
    port: parseInt(options.dbPort || String(baseSettings.db.port), 10),
    username: options.dbUsername || baseSettings.db.username,
    password: options.dbPassword || baseSettings.db.password,
    tls: options.dbTls !== undefined ? options.dbTls : baseSettings.db.tls,
    timeout: parseInt(options.dbTimeout || String(baseSettings.db.timeout), 10),
    retry: parseInt(options.dbRetry || String(baseSettings.db.retry), 10),
    embeddingCsvPath: options.dbEmbeddingCsvPath || baseSettings.db.embeddingCsvPath,
    metric: options.dbMetric || baseSettings.db.metric,
    k: parseInt(options.dbK || String(baseSettings.db.k), 10),
  },
};

// Setup logging
const logger = setupLogging(settings.mcp.logLevel);

// Create and run server
const server = new KdbxMcpServer(settings, logger);

server.run().catch((error) => {
  logger.error(`Fatal error: ${error}`);
  process.exit(1);
});

