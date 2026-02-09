#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { google } from "googleapis";

const SITE_URL = process.env.SITE_URL || "sc-domain:teamday.ai";

async function getAuthClient() {
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/webmasters.readonly"],
  });
  return auth.getClient();
}

async function getSearchConsoleClient() {
  const authClient = await getAuthClient();
  return google.searchconsole({ version: "v1", auth: authClient });
}

const server = new Server(
  {
    name: "search-console",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_sites",
        description: "List all sites you have access to in Search Console",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "query_search_analytics",
        description:
          "Query search analytics data for teamday.ai. Returns clicks, impressions, CTR, and position data.",
        inputSchema: {
          type: "object",
          properties: {
            startDate: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            endDate: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
            },
            dimensions: {
              type: "array",
              items: { type: "string" },
              description:
                "Dimensions to group by: query, page, country, device, date, searchAppearance",
            },
            rowLimit: {
              type: "number",
              description: "Max rows to return (default 25, max 25000)",
            },
            startRow: {
              type: "number",
              description: "Starting row for pagination (default 0)",
            },
            dimensionFilterGroups: {
              type: "array",
              description: "Filters to apply to dimensions",
              items: {
                type: "object",
                properties: {
                  filters: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        dimension: { type: "string" },
                        operator: { type: "string" },
                        expression: { type: "string" },
                      },
                    },
                  },
                },
              },
            },
          },
          required: ["startDate", "endDate"],
        },
      },
      {
        name: "get_top_queries",
        description:
          "Get top search queries for teamday.ai for the last N days",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Number of days to look back (default 28)",
            },
            limit: {
              type: "number",
              description: "Number of queries to return (default 25)",
            },
          },
        },
      },
      {
        name: "get_top_pages",
        description: "Get top pages for teamday.ai for the last N days",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Number of days to look back (default 28)",
            },
            limit: {
              type: "number",
              description: "Number of pages to return (default 25)",
            },
          },
        },
      },
      {
        name: "get_performance_summary",
        description:
          "Get overall performance summary (total clicks, impressions, avg CTR, avg position) for a date range",
        inputSchema: {
          type: "object",
          properties: {
            days: {
              type: "number",
              description: "Number of days to look back (default 28)",
            },
          },
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const searchconsole = await getSearchConsoleClient();

    switch (name) {
      case "list_sites": {
        const response = await searchconsole.sites.list();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "query_search_analytics": {
        const response = await searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: args.startDate,
            endDate: args.endDate,
            dimensions: args.dimensions || ["query"],
            rowLimit: args.rowLimit || 25,
            startRow: args.startRow || 0,
            dimensionFilterGroups: args.dimensionFilterGroups,
          },
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response.data, null, 2),
            },
          ],
        };
      }

      case "get_top_queries": {
        const days = args.days || 28;
        const limit = args.limit || 25;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const response = await searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            dimensions: ["query"],
            rowLimit: limit,
          },
        });

        const rows = response.data.rows || [];
        const formatted = rows.map((row) => ({
          query: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: (row.ctr * 100).toFixed(2) + "%",
          position: row.position.toFixed(1),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
                  topQueries: formatted,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_top_pages": {
        const days = args.days || 28;
        const limit = args.limit || 25;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const response = await searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            dimensions: ["page"],
            rowLimit: limit,
          },
        });

        const rows = response.data.rows || [];
        const formatted = rows.map((row) => ({
          page: row.keys[0],
          clicks: row.clicks,
          impressions: row.impressions,
          ctr: (row.ctr * 100).toFixed(2) + "%",
          position: row.position.toFixed(1),
        }));

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
                  topPages: formatted,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_performance_summary": {
        const days = args.days || 28;
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const response = await searchconsole.searchanalytics.query({
          siteUrl: SITE_URL,
          requestBody: {
            startDate: startDate.toISOString().split("T")[0],
            endDate: endDate.toISOString().split("T")[0],
            dimensions: ["date"],
            rowLimit: 1000,
          },
        });

        const rows = response.data.rows || [];
        const totals = rows.reduce(
          (acc, row) => {
            acc.clicks += row.clicks;
            acc.impressions += row.impressions;
            acc.positionSum += row.position * row.impressions;
            return acc;
          },
          { clicks: 0, impressions: 0, positionSum: 0 }
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  period: `${startDate.toISOString().split("T")[0]} to ${endDate.toISOString().split("T")[0]}`,
                  summary: {
                    totalClicks: totals.clicks,
                    totalImpressions: totals.impressions,
                    averageCTR:
                      ((totals.clicks / totals.impressions) * 100).toFixed(2) +
                      "%",
                    averagePosition: (
                      totals.positionSum / totals.impressions
                    ).toFixed(1),
                  },
                  dailyData: rows.map((row) => ({
                    date: row.keys[0],
                    clicks: row.clicks,
                    impressions: row.impressions,
                    ctr: (row.ctr * 100).toFixed(2) + "%",
                    position: row.position.toFixed(1),
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Search Console MCP server running");
}

main().catch(console.error);
