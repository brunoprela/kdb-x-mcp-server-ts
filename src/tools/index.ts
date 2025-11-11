import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import type { KDBConfig } from '../settings.js';
import { registerTool as registerSqlQuery } from './kdbx-run-sql-query.js';
import { registerTool as registerSimSearch } from './kdbx-sim-search.js';

const registeredTools: string[] = [];

export function registerTools(
  server: McpServer,
  config: KDBConfig,
  logger: Logger,
  aiLibsAvailable: boolean
): void {
  logger.info('='.repeat(30) + ' Starting tool registration process ' + '='.repeat(30));

  try {
    // Register SQL query tool
    registerSqlQuery(server, config, logger);
    registeredTools.push('kdbx_run_sql_query');
    logger.info("Registered tool: 'kdbx_run_sql_query'");

    // Register similarity search tools if AI libs are available
    if (aiLibsAvailable) {
      registerSimSearch(server, config, logger, aiLibsAvailable);
      registeredTools.push('kdbx_similarity_search', 'kdbx_hybrid_search');
      logger.info("Registered tool: 'kdbx_similarity_search'");
      logger.info("Registered tool: 'kdbx_hybrid_search'");
    } else {
      logger.info('AI Libs not available - skipping similarity search tools');
    }

    logger.info('='.repeat(30) + ' Tools registration summary ' + '='.repeat(30));
    logger.info(`Successfully registered: ${registeredTools.length} tools`);
    if (registeredTools.length > 0) {
      logger.info(`Registered tools: ${registeredTools.join(', ')}`);
    }
    logger.info('='.repeat(60));
  } catch (e) {
    logger.error(`Failed to register tools: ${e}`);
    throw e;
  }
}

