# Google Search Console MCP Server

MCP server for querying Google Search Console data — rankings, impressions, CTR, and search analytics.

## Setup

1. Create a Google Cloud service account with Search Console access
2. Grant the `webmasters.readonly` scope
3. Set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the service account JSON

## Configuration

| Environment Variable | Required | Description |
|---|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | Yes | Path to Google service account JSON |
| `SITE_URL` | No | Search Console property (default: `sc-domain:teamday.ai`) |

## Tools

| Tool | Description |
|---|---|
| `list_sites` | List all Search Console properties you have access to |
| `query_search_analytics` | Raw analytics query with dimensions, filters, and pagination |
| `get_top_queries` | Top search queries for the last N days |
| `get_top_pages` | Top pages for the last N days |
| `get_performance_summary` | Aggregate performance (clicks, impressions, avg CTR, avg position) |

## Usage in Claude Code

Add to your `.claude/settings.json`:

```json
{
  "mcpServers": {
    "search-console": {
      "command": "node",
      "args": ["/path/to/mcp/search-console-mcp/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json",
        "SITE_URL": "sc-domain:yourdomain.com"
      }
    }
  }
}
```
