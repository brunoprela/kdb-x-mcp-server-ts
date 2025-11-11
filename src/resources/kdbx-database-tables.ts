import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import type { KDBConfig } from '../settings.js';
import { getKDBConnection } from '../utils/kdbx.js';
import { formatDataForDisplay } from '../utils/format-utils.js';

async function kdbxDescribeTableImpl(
  table: string,
  config: KDBConfig,
  logger: Logger
): Promise<string> {
  try {
    const conn = await getKDBConnection(config, logger);

    // Get table metadata and sample data
    // Placeholder - needs actual KDB-X client implementation
    const totalRecords = await conn.query(`{count get x}`, table);
    const schemaData = await conn.query(`meta`, table);
    const partitionedTable = await conn.query(`{x in .Q.pt}`, table);

    const outputLines: string[] = [
      `\n  TABLE ANALYSIS: ${table}`,
      '='.repeat(60),
    ];

    outputLines.push('\n Schema Information:');
    outputLines.push(formatDataForDisplay(schemaData, table, logger));

    if (totalRecords > 0) {
      const previewSize = Math.min(3, totalRecords);
      let previewData;
      if (!partitionedTable) {
        previewData = await conn.query(`{x sublist get y}`, previewSize, table);
      } else {
        previewData = await conn.query(`{.Q.ind[get y;til x]}`, previewSize, table);
      }

      outputLines.push(`\n Data Preview (${previewSize} records):`);
      outputLines.push(formatDataForDisplay(previewData, table, logger));
    } else {
      outputLines.push('\n Table is empty - no data to preview');
    }

    return outputLines.join('\n');
  } catch (error: any) {
    logger.error(`Failed to analyze table '${table}': ${error}`);
    return `\n TABLE ANALYSIS FAILED: ${table}\n${'='.repeat(60)}\nError: ${error}`;
  }
}

async function kdbxDescribeTablesImpl(
  config: KDBConfig,
  logger: Logger
): Promise<string> {
  try {
    const conn = await getKDBConnection(config, logger);

    // Get all tables - placeholder
    const availableTables = await conn.query(`tables`);

    // Filter out internal AI library index tables
    const filteredTables = availableTables.filter(
      (table: string) =>
        !table.endsWith('document') &&
        !table.endsWith('stats') &&
        !table.endsWith('token')
    );

    if (filteredTables.length === 0) {
      return ' Database is empty - no tables found';
    }

    const overviewParts: string[] = [
      '  DATABASE SCHEMA OVERVIEW',
      '═'.repeat(60),
      ` Found ${filteredTables.length} table(s)\n`,
    ];

    for (const tableName of filteredTables) {
      const tableAnalysis = await kdbxDescribeTableImpl(tableName, config, logger);
      overviewParts.push(tableAnalysis);
    }

    const completeOverview = overviewParts.join('\n');
    logger.debug(completeOverview);
    return completeOverview;
  } catch (error: any) {
    logger.error(`Database schema analysis failed: ${error}`);
    return ` DATABASE ANALYSIS ERROR\n${'═'.repeat(60)}\nFailed to analyze database schema: ${error}`;
  }
}

export function registerResource(
  server: McpServer,
  config: KDBConfig,
  logger: Logger
): void {
  // Use the high-level registerResource API
  server.registerResource(
    'kdbx_describe_tables',
    'kdbx://tables',
    {
      description: 'Get comprehensive overview of all database tables with schema information and sample data.',
      mimeType: 'text/plain',
    },
    async () => {
      const content = await kdbxDescribeTablesImpl(config, logger);
      return {
        contents: [
          {
            uri: 'kdbx://tables',
            mimeType: 'text/plain',
            text: content,
          },
        ],
      };
    }
  );
}

