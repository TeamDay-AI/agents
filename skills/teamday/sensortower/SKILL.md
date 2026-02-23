---
name: sensortower
description: Query Sensor Tower for mobile app market intelligence — ad creative analytics, competitive intelligence, top charts, app revenue estimates, and store marketing data. Use for competitive UA research and market benchmarking.
version: 1.0.0
allowed-tools: Bash
metadata:
  credentials:
    - SENSOR_TOWER_API_TOKEN
  mcp:
    package: sensortower-mcp
    install: pip install sensortower-mcp
    command: python3 -m sensortower_mcp.server
---

# Sensor Tower Skill

Query Sensor Tower's market intelligence APIs for competitive UA analysis, app performance benchmarking, and ad creative research.

## Setup

Get your API token from [Sensor Tower Account Settings](https://app.sensortower.com/account).

```bash
export SENSOR_TOWER_API_TOKEN=st_xxxxxxxxxxxxxxxxxx
```

## Via MCP (Recommended)

When the Sensor Tower MCP is connected in TeamDay integrations, use MCP tools directly:

```bash
# Top apps by revenue (benchmark CPI context)
mcp__sensortower__get_top_apps(category="games", country="US", date="2026-02")

# App analysis — revenue + downloads estimate
mcp__sensortower__get_app_analysis(app_id="id1234567890", country="US")

# Ad intelligence — what creatives competitors are running
mcp__sensortower__get_ad_intelligence(app_id="id1234567890", network="Facebook")

# Market analysis — category trends
mcp__sensortower__get_market_analysis(category="puzzle_games", country="US")

# Usage intelligence — DAU/MAU estimates
mcp__sensortower__get_usage_intelligence(app_id="id1234567890", country="US")
```

## Via REST API (Fallback)

If MCP is not connected, call the API directly with curl:

```bash
# Top charts (free games, US App Store)
curl -s "https://api.sensortower.com/v1/ios/rankings/get_chart?app_ids=all&category=6014&country=US&device_type=iphone&chart_type=topfreeapplications&date=$(date +%Y-%m-%d)" \
  -H "Authorization: $SENSOR_TOWER_API_TOKEN" | python3 -m json.tool | head -50

# App revenue estimate
curl -s "https://api.sensortower.com/v1/ios/sales_report_estimates?app_ids=APP_ID&countries=US&date_granularity=monthly&start_date=2026-01-01&end_date=2026-02-01" \
  -H "Authorization: $SENSOR_TOWER_API_TOKEN" | python3 -m json.tool
```

## Key Use Cases for UA Creative Analysis

### 1. Competitor Creative Intelligence
Find what ad formats top-grossing games in your category are running:

```bash
# Get competitor app IDs from top charts first
# Then pull their ad creative data
mcp__sensortower__get_ad_intelligence(
  app_id="competitor_app_id",
  network="Facebook",
  start_date="2026-01-01",
  end_date="2026-02-23"
)
```

### 2. Benchmark CPI by Category
Understand market CPI benchmarks to evaluate your creative performance:

```bash
mcp__sensortower__get_market_analysis(
  category="casual_games",
  country="US",
  metric="cpi_benchmark"
)
```

### 3. Creative Format Trends
Identify rising creative formats (playables, ugc-style, tutorials):

```bash
mcp__sensortower__get_ad_intelligence(
  category="puzzle",
  creative_type="playable",
  country="US"
)
```

## Workflow: Competitive Creative Brief

Use SensorTower to enrich AI creative briefs with market context:

1. Pull top 5 apps in your category from top charts
2. Get their ad creative data (formats, networks, regions)
3. Identify what hook styles are trending for the category
4. Feed insights into the creative brief generator

```bash
# Step 1: Get top games
mcp__sensortower__get_top_apps(category="casual_games", country="US")

# Step 2: Pull creative intel for each competitor
mcp__sensortower__get_ad_intelligence(app_id="competitor_id", network="all")

# Step 3: Claude synthesizes → generates briefs with competitive context
```

## Notes
- Sensor Tower API requires a paid plan with API access enabled
- Rate limits apply — use reasonable intervals between calls
- Creative intelligence data may have a 3-7 day delay
- iOS App IDs use numeric format (e.g. `id1234567890`), Android uses package name
