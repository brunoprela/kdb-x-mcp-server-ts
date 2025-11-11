import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import type { KDBConfig } from '../settings.js';
import { getKDBConnection } from '../utils/kdbx.js';
import { z } from 'zod';

const MAX_ROWS_RETURNED = 1000;

export interface QueryResult {
  status: 'success' | 'error';
  data?: any[];
  message?: string;
  error_type?: string;
  technical_details?: string;
}

async function runQueryImpl(
  sqlSelectQuery: string,
  config: KDBConfig,
  logger: Logger
): Promise<QueryResult> {
  try {
    const dangerousKeywords = ['INSERT', 'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE'];
    const queryUpper = sqlSelectQuery.toUpperCase().trim();

    for (const keyword of dangerousKeywords) {
      if (queryUpper.includes(keyword) && !queryUpper.startsWith('SELECT')) {
        throw new Error(`Query contains dangerous keyword: ${keyword}`);
      }
    }

    const conn = await getKDBConnection(config, logger);
    
    // Execute query - this is a placeholder that needs actual KDB-X client implementation
    // The Python version uses: conn('{r:.s.e x;`rowCount`data!(count r;.j.j y sublist r)}', ...)
    // In TypeScript, we'll need to adapt this based on the KDB-X client library used
    const result = await conn.query(
      `{r:.s.e x; \`rowCount\`data!(count r;.j.j y sublist r)}`
    );
    
    const total = result.rowCount || 0;
    if (total === 0) {
      return { status: 'success', data: [], message: 'No rows returned' };
    }

    const rows = result.data || [];
    if (total > MAX_ROWS_RETURNED) {
      logger.info(
        `Table has ${total} rows. Query returned truncated data to ${MAX_ROWS_RETURNED} rows.`
      );
      return {
        status: 'success',
        data: rows,
        message: `Showing first ${MAX_ROWS_RETURNED} of ${total} rows`,
      };
    }

    logger.info(`Query returned ${total} rows.`);
    return { status: 'success', data: rows };
  } catch (e: any) {
    logger.error(`Query failed: ${e}`);
    if (e.message && e.message.includes('.s.e')) {
      logger.error(
        'It looks like the SQL interface is not loaded. You can load it manually by running .s.init[]:'
      );
      return {
        status: 'error',
        error_type: 'sql_interface_not_loaded',
        message:
          'It looks like the SQL interface is not loaded in the KDB-X database. Please initialize it by running `.s.init[]` in your KDB-X session, or contact your system administrator.',
        technical_details: String(e),
      };
    }
    return { status: 'error', message: String(e) };
  }
}

let toolRegistered = false;

export function registerTool(
  server: McpServer,
  config: KDBConfig,
  logger: Logger
): void {
  if (toolRegistered) {
    return;
  }
  toolRegistered = true;

  // Use the high-level registerTool API
  server.registerTool(
    'kdbx_run_sql_query',
    {
      description: `Execute a SQL query and return structured results only to be used on kdb and not on kdbai.

This function processes SQL SELECT statements to retrieve data from the underlying
database. It parses the query, executes it against the data source, and returns
the results in a structured format suitable for further analysis or display.

Use the kdbx_sql_query_guidance resource when creating queries

Supported query types:
    - SELECT statements with column specifications
    - WHERE clauses for filtering
    - ORDER BY for result sorting
    - LIMIT for result pagination
    - Basic aggregation functions (COUNT, SUM, AVG, etc.)

For query syntax and examples, see: file://guidance/kdbx-sql-queries`,
      inputSchema: {
        query: z.string().describe('SQL SELECT query string to execute. Must be a valid SQL statement following standard SQL syntax conventions.'),
      },
    },
    async ({ query }) => {
      const result = await runQueryImpl(query, config, logger);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}

