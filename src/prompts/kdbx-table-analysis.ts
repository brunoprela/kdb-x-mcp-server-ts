import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Logger } from '../utils/logging.js';
import { z } from 'zod';

async function tableDeepDivePromptImpl(
  tableName: string,
  analysisType: string = 'statistical',
  sampleSize: number = 100
): Promise<string> {
  const analysisInstructions: Record<string, string> = {
    statistical: `
        Focus on statistical analysis:
        - Descriptive statistics for numerical columns
        - Data patterns and distributions
        - Temporal trends (if time-based data)
        - Variance and data spread characteristics
        `,
    data_quality: `
        Focus on data quality assessment:
        - Completeness and missing data patterns
        - Data consistency
        - Duplicate detection and uniqueness
        - Format issues
        `,
  };

  try {
    const analysisInstruction =
      analysisInstructions[analysisType] || analysisInstructions['statistical'];

    const prompt = `
You are a data analyst conducting an in-depth analysis of the table: ${tableName}

First, examine the table structure and sample data to understand its content and characteristics.
Use the table-specific resources to get detailed information about this table.
Use kdbx_sql_query_guidance resource for query syntax.

${analysisInstruction.trim()}

Structure your analysis as follows:

1. **Table Overview**: 
   - Business purpose and context of this table
   - Key entity or concept it represents per column
   - Total record count and data volume

2. **Data Profile**:
   - Sample data examination (suggest using LIMIT ${sampleSize})
   - Unique value counts for categorical fields
   - Range analysis for numerical fields

3. **Temporal Analysis** (if applicable):
   - Time range coverage
   - Data freshness and update patterns  
   - Seasonal or trend patterns
   - Data gaps or irregularities

Focus on actionable insights that would help someone understand and effectively use this data for analysis or decision-making.

Table to analyze: ${tableName}
Analysis type: ${analysisType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
        `.trim();

    return prompt;
  } catch (e: any) {
    return `Error generating prompt: ${String(e)}`;
  }
}

export function registerPrompt(server: McpServer, _logger: Logger): void {
  // Use the high-level registerPrompt API
  server.registerPrompt(
    'kdbx_table_analysis',
    {
      description: 'Conduct detailed analysis of a specific table.',
      argsSchema: {
        table_name: z.string().describe('Name of the table to analyze'),
        analysis_type: z
          .string()
          .optional()
          .describe('Type of analysis: statistical or data_quality'),
        sample_size: z
          .string()
          .optional()
          .describe('Suggested sample size for data exploration'),
      },
    },
    async ({ table_name, analysis_type = 'statistical', sample_size = '100' }) => {
      const parsedSampleSize = parseInt(sample_size, 10) || 100;
      const validAnalysisType = analysis_type === 'data_quality' ? 'data_quality' : 'statistical';
      const prompt = await tableDeepDivePromptImpl(
        table_name,
        validAnalysisType,
        parsedSampleSize
      );
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: prompt,
            },
          },
        ],
      };
    }
  );
}

