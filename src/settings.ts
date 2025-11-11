import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const LogLevelSchema = z.enum(['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']);
const TransportSchema = z.enum(['stdio', 'streamable-http']);

const KDBConfigSchema = z.object({
  host: z.string().default('127.0.0.1'),
  port: z.number().int().positive().default(5000),
  username: z.string().default(''),
  password: z.string().default(''),
  tls: z.boolean().default(false),
  timeout: z.number().int().positive().default(1),
  retry: z.number().int().nonnegative().default(2),
  embeddingCsvPath: z.string().default('src/mcp_server/utils/embeddings.csv'),
  metric: z.string().default('CS'),
  k: z.number().int().positive().default(5),
});

const ServerConfigSchema = z.object({
  serverName: z.string().default('KDBX_MCP_Server'),
  logLevel: LogLevelSchema.default('INFO'),
  transport: TransportSchema.default('streamable-http'),
  port: z.number().int().positive().default(8000),
  host: z.string().default('127.0.0.1'),
});

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type Transport = z.infer<typeof TransportSchema>;
export type KDBConfig = z.infer<typeof KDBConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

function getEnvVar(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

function getEnvVarAsNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvVarAsBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

export function loadKDBConfig(): KDBConfig {
  return {
    host: getEnvVar('KDBX_DB_HOST', '127.0.0.1'),
    port: getEnvVarAsNumber('KDBX_DB_PORT', 5000),
    username: getEnvVar('KDBX_DB_USERNAME', ''),
    password: getEnvVar('KDBX_DB_PASSWORD', ''),
    tls: getEnvVarAsBoolean('KDBX_DB_TLS', false),
    timeout: getEnvVarAsNumber('KDBX_DB_TIMEOUT', 1),
    retry: getEnvVarAsNumber('KDBX_DB_RETRY', 2),
    embeddingCsvPath: getEnvVar('KDBX_DB_EMBEDDING_CSV_PATH', 'src/mcp_server/utils/embeddings.csv'),
    metric: getEnvVar('KDBX_DB_METRIC', 'CS'),
    k: getEnvVarAsNumber('KDBX_DB_K', 5),
  };
}

export function loadServerConfig(): ServerConfig {
  return {
    serverName: getEnvVar('KDBX_MCP_SERVER_NAME', 'KDBX_MCP_Server'),
    logLevel: (getEnvVar('KDBX_MCP_LOG_LEVEL', 'INFO') as LogLevel) || 'INFO',
    transport: (getEnvVar('KDBX_MCP_TRANSPORT', 'streamable-http') as Transport) || 'streamable-http',
    port: getEnvVarAsNumber('KDBX_MCP_PORT', 8000),
    host: getEnvVar('KDBX_MCP_HOST', '127.0.0.1'),
  };
}

export interface AppSettings {
  mcp: ServerConfig;
  db: KDBConfig;
}

export function loadAppSettings(): AppSettings {
  return {
    mcp: loadServerConfig(),
    db: loadKDBConfig(),
  };
}

