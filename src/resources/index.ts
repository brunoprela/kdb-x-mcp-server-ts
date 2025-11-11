import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import type { KDBConfig } from '../settings.js';
import { registerResource as registerDatabaseTables } from './kdbx-database-tables.js';
import { registerResource as registerSqlGuidance } from './kdbx-sql-query-guidance.js';

export function registerResources(
  server: McpServer,
  config: KDBConfig,
  logger: Logger
): void {
  logger.info('='.repeat(30) + ' Starting resource registration process ' + '='.repeat(30));

  try {
    registerDatabaseTables(server, config, logger);
    logger.info("Registered resource: 'kdbx://tables'");

    registerSqlGuidance(server);
    logger.info("Registered resource: 'file://guidance/kdbx-sql-queries'");

    logger.info('='.repeat(30) + ' Resource registration summary ' + '='.repeat(30));
    logger.info('Successfully registered resources');
    logger.info('='.repeat(60));
  } catch (e) {
    logger.error(`Failed to register resources: ${e}`);
    throw e;
  }
}

