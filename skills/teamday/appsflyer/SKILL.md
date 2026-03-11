---
name: appsflyer
description: Pull creative performance data from AppsFlyer. Use for UA creative analysis — CPI, IPM, ROAS, installs per creative, and fatigue detection. Run before generating creative performance reports.
version: 1.0.0
allowed-tools: Bash, Read, Write
metadata:
  credentials:
    - APPSFLYER_API_TOKEN
---

# AppsFlyer Creative Performance

Pull mobile UA creative data from AppsFlyer's Pull API for performance analysis and fatigue detection.

## Quick Start

```bash
# Creative performance (last 7 days)
APPSFLYER_API_TOKEN=$APPSFLYER_API_TOKEN python3 .claude/skills/appsflyer/scripts/creative-performance.py \
  --app-id com.example.game --days 7

# Creative performance (date range)
python3 .claude/skills/appsflyer/scripts/creative-performance.py \
  --app-id com.example.game --from 2026-02-01 --to 2026-02-23

# Fatigue detection (daily IPM trends, 14 days)
python3 .claude/skills/appsflyer/scripts/creative-trends.py \
  --app-id com.example.game --days 14

# Save to file for processing
python3 .claude/skills/appsflyer/scripts/creative-trends.py \
  --app-id com.example.game --days 14 > /tmp/af-trends.json
```

## What Each Script Returns

### creative-performance.py
Aggregate creative metrics for the period:
```json
{
  "meta": { "app_id": "...", "from": "...", "to": "...", "total_spend": 12500.00 },
  "creatives": [
    {
      "creative": "hero_upgrade_v3",
      "ad_network": "Meta",
      "installs": 3420,
      "cost": 4100.00,
      "cpi": 1.20,
      "ipm": 8.4,
      "ctr": 2.1,
      "cvr": 12.3,
      "roas": 1.8,
      "country_breakdown": { "US": 1200, "DE": 800 }
    }
  ]
}
```

### creative-trends.py
Daily IPM per creative with fatigue classification:
```json
{
  "summary": { "Winner": 3, "Stable": 5, "Warning": 2, "Fatigued": 1 },
  "creatives": [
    {
      "creative": "fail_montage_v2",
      "status": "Fatigued",
      "peak_ipm": 12.4,
      "current_ipm": 7.1,
      "ipm_drop_pct": 42.7,
      "daily": [{ "date": "2026-02-10", "ipm": 12.4 }, ...]
    }
  ]
}
```

## Fatigue Thresholds
- **Winner**: IPM at/near peak (< 5% drop)
- **Stable**: Moderate decline (< 20%)
- **Warning**: IPM dropped > 20% from 3-day peak
- **Fatigued**: IPM dropped > 30% from 3-day peak

## Typical Workflow for UA Creative Report

1. **Pull trends** → identify which creatives are fatiguing
2. **Pull performance** → get spend, CPI, ROAS per creative
3. **Cross-reference** → find high-spend fatigued creatives (most urgent to pause)
4. **Generate HTML** → build the full Creative Performance Lab dashboard

```bash
# Step 1
python3 .claude/skills/appsflyer/scripts/creative-trends.py --app-id $APP_ID --days 14 > trends.json

# Step 2
python3 .claude/skills/appsflyer/scripts/creative-performance.py --app-id $APP_ID --days 7 > perf.json

# Step 3 + 4: Claude analyzes both files and generates the HTML report
```

## Setup

1. Get your API token: AppsFlyer dashboard → **API Access** → Copy V2.0 Pull API Token
2. Set env: `APPSFLYER_API_TOKEN=your_token`
3. Get your App ID from the AppsFlyer dashboard (e.g. `id1234567890` for iOS, `com.example.game` for Android)

## API Notes
- Pull API reports installs with creative dimensions (`Ad`, `Adset`, `Campaign`)
- Date range max: 90 days
- Timezone: UTC by default
- Creative data only present for non-organic traffic
- If `Ad` column is empty, creative-level data isn't configured in AppsFlyer — enable Creative Clusters or ensure ad names are passed in SDK/S2S
