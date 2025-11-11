import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import { registerPrompt } from './kdbx-table-analysis.js';

export function registerPrompts(server: McpServer, logger: Logger): void {
    logger.info('='.repeat(30) + ' Starting prompt registration process ' + '='.repeat(30));

    try {
        registerPrompt(server, logger);
        logger.info("Registered prompt: 'kdbx_table_analysis'");

        logger.info('='.repeat(30) + ' Prompt registration summary ' + '='.repeat(30));
        logger.info('Successfully registered prompts');
        logger.info('='.repeat(60));
    } catch (e) {
        logger.error(`Failed to register prompts: ${e}`);
        throw e;
    }
}

