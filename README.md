# KDB-X MCP Server (TypeScript)

This is a TypeScript implementation of the KDB-X MCP Server that enables end users to query KDB-X data through natural language, providing production-grade resources, prompts, and tools for seamless data interaction.

Built on an extensible framework with configurable templates, it allows for intuitive extension with custom integrations tailored to your specific needs.

The server leverages a combination of curated resources, intelligent prompts, and robust tools to provide appropriate guardrails and guidance for both users and AI models interacting with KDB-X.

## Features

- **SQL Interface to KDB-X**: Run SELECT SQL queries against KDB-X databases
- **Built-In Query Safety Protection**: Automatic detection and blocking of dangerous SQL operations like INSERT, DROP, DELETE etc.
- **Smart Query Result Optimization**: Smart result truncation (max 1000 rows) with clear messaging about data limits
- **SQL Query Guidance for LLM**: Comprehensive LLM-ready MCP resource with syntax examples and best practices
- **Database Schema Discovery**: Explore and understand your database tables and structure using the included MCP resource
- **Auto-Discovery System**: Automatic discovery and registration of tools, resources, and prompts
- **Resilient Connection Management**: Robust KDB-X connection handling with automatic retry logic and connection caching
- **Vector Similarity Search**: Perform semantic search on KDB-X tables using embeddings
- **Hybrid Search**: Combine vector and sparse text search for enhanced results
- **TypeScript & Modern Tooling**: Built with TypeScript, featuring strict type checking and modern development practices

## Prerequisites

- Node.js 20.0.0 or higher
- A KDB-X/KDB+ Service listening on a host and port that will be accessible to the MCP Server
- An MCP Client installed (e.g., Claude Desktop, GitHub Copilot in VSCode)

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd kdb-x-mcp-server-ts

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

Configuration can be provided via:
1. Command line arguments (highest priority)
2. Environment variables
3. `.env` file
4. Default values

### Environment Variables

**MCP Options:**
- `KDBX_MCP_SERVER_NAME` - Name identifier for the MCP server instance (default: `KDBX_MCP_Server`)
- `KDBX_MCP_LOG_LEVEL` - Logging verbosity level: DEBUG, INFO, WARNING, ERROR, CRITICAL (default: `INFO`)
- `KDBX_MCP_TRANSPORT` - Communication protocol: `stdio` or `streamable-http` (default: `streamable-http`)
- `KDBX_MCP_PORT` - HTTP server port (default: `8000`)
- `KDBX_MCP_HOST` - HTTP server bind address (default: `127.0.0.1`)

**Database Options:**
- `KDBX_DB_HOST` - KDB-X server hostname or IP address (default: `127.0.0.1`)
- `KDBX_DB_PORT` - KDB-X server port number (default: `5000`)
- `KDBX_DB_USERNAME` - Username for KDB-X authentication (default: empty)
- `KDBX_DB_PASSWORD` - Password for KDB-X authentication (default: empty)
- `KDBX_DB_TLS` - Enable TLS for KDB-X connections (default: `false`)
- `KDBX_DB_TIMEOUT` - Timeout in seconds for KDB-X connection attempts (default: `1`)
- `KDBX_DB_RETRY` - Number of connection retry attempts on failure (default: `2`)
- `KDBX_DB_EMBEDDING_CSV_PATH` - Path to embeddings CSV (default: `src/mcp_server/utils/embeddings.csv`)
- `KDBX_DB_METRIC` - Distance metric for vector similarity search: CS, L2, IP (default: `CS`)
- `KDBX_DB_K` - Default number of results from vector searches (default: `5`)

## Usage

### Running the Server

```bash
# Using defaults
npm start

# Using environment variables
export KDBX_MCP_PORT=7001
export KDBX_DB_RETRY=4
npm start

# Using command line arguments
npm start -- --mcp.port 7001 --db.retry 4
```

### Development Mode

```bash
# Run with hot reload
npm run dev
```

## Tools

### kdbx_run_sql_query

Execute SQL SELECT queries against KDB-X database.

**Parameters:**
- `query` (string, required): SQL SELECT query string to execute

**Returns:**
- JSON object with query results (max 1000 rows)

### kdbx_similarity_search

Perform vector similarity search on a KDB-X table (requires AI libs).

**Parameters:**
- `table_name` (string, required): Name of the table to search
- `query` (string, required): Text query to convert to vector and search
- `n` (number, optional): Number of results to return

**Returns:**
- Dictionary containing search results

### kdbx_hybrid_search

Perform hybrid search combining vector similarity and sparse text search (requires AI libs).

**Parameters:**
- `table_name` (string, required): Name of the table to search
- `query` (string, required): Text query to convert to vectors
- `n` (number, optional): Number of results to return

**Returns:**
- Dictionary containing search results

## Resources

### kdbx://tables

Get comprehensive overview of all database tables with schema information and sample data.

### file://guidance/kdbx-sql-queries

SQL query syntax guidance and examples for executing queries against KDB-X.

## Prompts

### kdbx_table_analysis

Generate a detailed analysis prompt for a specific table.

**Parameters:**
- `table_name` (string, required): Name of the table to analyze
- `analysis_type` (string, optional): Type of analysis - `statistical` or `data_quality` (default: `statistical`)
- `sample_size` (number, optional): Suggested sample size for data exploration (default: `100`)

## Embedding Configuration

Before using similarity search features, configure embedding models in the embeddings CSV file.

The file should have the following columns:
- `table` - Table name
- `embedding_column` - Column name containing dense embeddings
- `embedding_provider` - Provider name (e.g., `openai`, `sentence_transformers`)
- `embedding_model` - Model name
- `sparse_embedding_column` - Column name for sparse embeddings (optional)
- `sparse_index_name` - Sparse index name (optional)
- `sparse_tokenizer_provider` - Sparse tokenizer provider (optional)
- `sparse_tokenizer_model` - Sparse tokenizer model (optional)

### Supported Embedding Providers

- **OpenAI**: Requires `OPENAI_API_KEY` environment variable
- **SentenceTransformers**: Uses `@xenova/transformers` for local model execution

## Development

### Project Structure

```
src/
├── cli.ts              # CLI entry point
├── server.ts           # Main server class
├── settings.ts         # Configuration management
├── tools/              # MCP tools
│   ├── kdbx-run-sql-query.ts
│   └── kdbx-sim-search.ts
├── resources/          # MCP resources
│   ├── kdbx-database-tables.ts
│   └── kdbx-sql-query-guidance.ts
├── prompts/            # MCP prompts
│   └── kdbx-table-analysis.ts
└── utils/              # Utility functions
    ├── kdbx.ts         # KDB-X connection handling
    ├── embeddings.ts   # Embedding providers
    ├── format-utils.ts # Data formatting
    └── logging.ts      # Logging setup
```

### Key Components

#### 1. Configuration Management (`src/settings.ts`)
- Uses Zod for schema validation
- Supports environment variables, CLI arguments, and `.env` files
- Type-safe configuration with proper defaults

#### 2. Server Architecture (`src/server.ts`)
- Main `KdbxMcpServer` class that orchestrates the entire server
- Handles connection validation, tool/resource/prompt registration
- Supports both stdio and streamable-http transports (stdio fully implemented)
- Uses the latest MCP SDK (`@modelcontextprotocol/sdk`) with high-level APIs

#### 3. Tools (`src/tools/`)
- **kdbx_run_sql_query**: SQL query execution with safety checks
- **kdbx_similarity_search**: Vector similarity search (requires AI libs)
- **kdbx_hybrid_search**: Hybrid vector + sparse text search (requires AI libs)

#### 4. Resources (`src/resources/`)
- **kdbx://tables**: Database schema overview
- **file://guidance/kdbx-sql-queries**: SQL query guidance

#### 5. Prompts (`src/prompts/`)
- **kdbx_table_analysis**: Table analysis prompt generator

#### 6. Utilities (`src/utils/`)
- **kdbx.ts**: KDB-X connection management (needs implementation)
- **embeddings.ts**: Embedding provider system (OpenAI, SentenceTransformers)
- **format-utils.ts**: Data formatting and display utilities
- **logging.ts**: Winston-based logging setup

### MCP SDK Integration

The code uses the official `@modelcontextprotocol/sdk` package with the latest high-level APIs:

- **Tools**: Uses `server.registerTool()` with Zod schemas for type-safe parameter validation
- **Resources**: Uses `server.registerResource()` with metadata configuration
- **Prompts**: Uses `server.registerPrompt()` with argument schemas
- All handlers use the modern `McpServer` class instead of the deprecated `Server` class

### Adding New Tools

1. Create a new file in `src/tools/`
2. Implement the tool registration function using `server.registerTool()`
3. Export and register in `src/tools/index.ts`

### Adding New Resources

1. Create a new file in `src/resources/`
2. Implement the resource registration function using `server.registerResource()`
3. Export and register in `src/resources/index.ts`

### Adding New Prompts

1. Create a new file in `src/prompts/`
2. Implement the prompt registration function using `server.registerPrompt()`
3. Export and register in `src/prompts/index.ts`

### Development Workflow

1. Install dependencies: `npm install`
2. Build: `npm run build`
3. Run: `npm start` or `npm run dev` (for development with hot reload)
4. Type check: `npm run type-check`
5. Lint: `npm run lint`
6. Format: `npm run format`

## KDB-X Connection

**Important**: This TypeScript implementation requires a KDB-X client library for Node.js. The current implementation includes placeholder code in `src/utils/kdbx.ts` that needs to be completed with an actual KDB-X client.

### Implementation Requirements

You will need to:

1. **Find or create a KDB-X client library for Node.js**
   - The Python version uses `pykx` which is a Python binding
   - For Node.js, options include:
     - A native Node.js binding (C++ addon)
     - An HTTP-based client if KDB-X supports HTTP queries
     - A TCP/IP socket client implementing the KDB protocol

2. **Implement the connection logic**
   - Replace the `KDBConnectionImpl` class in `src/utils/kdbx.ts` with actual connection code
   - Implement the `query()` method to execute KDB queries
   - Handle connection retry logic (already structured)
   - Implement connection caching (already structured)
   - The Python version uses q-language queries like:
     ```python
     conn('{r:.s.e x;`rowCount`data!(count r;.j.j y sublist r)}', sqlQuery, maxRows)
     ```
   - You'll need to translate this to your chosen client library's API

3. **Test the connection**
   - Verify connection establishment
   - Test query execution
   - Validate result parsing

### Testing the Implementation

Before the server can fully function, you'll need to:

1. Implement the KDB-X client connection
2. Test with a running KDB-X instance
3. Verify tool execution
4. Test resource access
5. Validate prompt generation

### Next Steps for Implementation

1. **Research KDB-X Node.js clients**: Look for existing libraries or create bindings
2. **Implement connection layer**: Complete `src/utils/kdbx.ts`
3. **Test with real KDB-X instance**: Verify all functionality
4. **Add error handling**: Enhance error messages for production use
5. **Performance optimization**: Add connection pooling, query caching if needed

## Testing

```bash
# Run type checking
npm run type-check

# Run linter
npm run lint

# Format code
npm run format
```

## Troubleshooting

### KDB-X Connection Issues

- Verify KDB-X service is running and accessible
- Check host and port configuration
- Ensure SQL interface is loaded (run `.s.init[]` in KDB-X session)
- For AI tools, ensure AI libs are loaded (run `.ai:use\`kx.ai` in KDB-X session)

### Embedding Issues

- Verify embedding CSV configuration file exists and is properly formatted
- Check that required environment variables are set (e.g., `OPENAI_API_KEY`)
- Ensure embedding models are accessible

### Port Already in Use

- Change the port using `--mcp.port` or `KDBX_MCP_PORT`
- Stop the service using the port

## License

MIT

## Architecture & Implementation Details

### Differences from Python Version

- **Type Safety**: TypeScript's type system provides compile-time safety
- **Async/Await**: Async/await patterns are used throughout
- **Module System**: Uses ES modules
- **Configuration**: Uses Zod instead of Pydantic for schema validation
- **Logging**: Uses Winston instead of Python's logging module

### Architecture Decisions

1. **Modular Design**: Each tool/resource/prompt is in its own file for maintainability
2. **Type Safety**: Strict TypeScript configuration ensures type safety
3. **Error Handling**: Comprehensive error handling with proper logging
4. **Extensibility**: Easy to add new tools/resources/prompts following the established patterns
5. **Modern MCP SDK**: Uses the latest `@modelcontextprotocol/sdk` with high-level registration APIs

### Embedding Providers

Two embedding providers are implemented:

1. **OpenAI Provider**: Requires `OPENAI_API_KEY` environment variable
2. **SentenceTransformers Provider**: Uses `@xenova/transformers` for local execution

Both support:
- Dense embeddings (vector representations)
- Sparse embeddings (token counts for BM25-style search)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

