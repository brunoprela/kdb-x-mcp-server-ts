import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function kdbxSqlQueryGuidanceImpl(): string {
  // Try to read from the same location as Python version
  const paths = [
    join(__dirname, '../../kdb-x-mcp-server/src/mcp_server/resources/kdbx_sql_query_guidance.txt'),
    join(__dirname, '../resources/kdbx_sql_query_guidance.txt'),
  ];

  for (const path of paths) {
    try {
      return readFileSync(path, 'utf-8');
    } catch {
      // Try next path
    }
  }

  // Fallback content if file not found
  return `KDB SQL Query Guide

Write ANSI-compliant SQL for kdb+ tables.

IMPORTANT - Column Name Quoting:
Always use double quotes around column names to avoid conflicts with SQL reserved words.
Examples: "Close", "Open", "Date", "Time", "Group", "Order", "Key", "Value"

Correct:   select avg("Close") from stocks;
Incorrect: select avg(Close) from stocks;

Basic Syntax:
SELECT [DISTINCT] columns FROM table
[LEFT|RIGHT|INNER|CROSS] JOIN table2 ON condition
WHERE conditions
GROUP BY columns
HAVING conditions
ORDER BY columns [ASC|DESC]
LIMIT n

For more details, see the full guidance file.`;
}

export function registerResource(server: McpServer): void {
  // Use the high-level registerResource API
  server.registerResource(
    'kdbx_sql_query_guidance',
    'file://guidance/kdbx-sql-queries',
    {
      description:
        'Provides guidance when using SQL select statements with the kdbx_run_sql_query tool.',
      mimeType: 'text/plain',
    },
    async () => {
      const content = kdbxSqlQueryGuidanceImpl();
      return {
        contents: [
          {
            uri: 'file://guidance/kdbx-sql-queries',
            mimeType: 'text/plain',
            text: content,
          },
        ],
      };
    }
  );
}

