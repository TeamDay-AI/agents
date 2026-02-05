# SEO Toolkit Plugin

Complete SEO toolkit with Search Console, Google Analytics, and Ahrefs integrations.

## Features

- **Search Performance** - Analyze rankings, clicks, impressions
- **Keyword Tracking** - Monitor keyword positions over time
- **Content Audits** - Identify optimization opportunities
- **Backlink Analysis** - Track and analyze backlink profile
- **Competitive Analysis** - Compare against competitors

## MCP Servers Included

| Server | Description |
|--------|-------------|
| `search-console` | Google Search Console data access |
| `google-analytics` | GA4 analytics data |
| `ahrefs` | Backlinks, keywords, domain metrics |

## Skills Included

- `seo-audit` - Comprehensive SEO audit
- `keyword-research` - Discover keyword opportunities
- `content-optimization` - Optimize content for search

## Agents Included

- `seo-specialist` - Expert SEO analyst

## Requirements

| Credential | Description |
|------------|-------------|
| `GOOGLE_APPLICATION_CREDENTIALS` | Google service account JSON path |
| `GOOGLE_PROJECT_ID` | GCP project ID |
| `AHREFS_API_KEY` | Ahrefs API key |

## Usage

### Check Rankings
```
What are our top performing pages this week?
```

### Find Quick Wins
```
Find pages ranking 5-15 that could reach top 5
```

### Competitor Analysis
```
Compare our keyword rankings to competitor.com
```

## Installation

```bash
/plugin install seo-toolkit
```

## MCP Server Setup

After installing, configure the MCP servers in your space settings:

1. **Search Console** - Enable Search Console API, create service account
2. **Google Analytics** - Install `analytics-mcp` via pipx
3. **Ahrefs** - Get API key from Ahrefs dashboard
