---
name: adjust
description: Pull creative performance data from Adjust. Use for UA creative analysis — CPI, IPM, installs, and spend per creative from the Adjust KPI Service. Run before generating creative performance reports.
version: 1.0.0
allowed-tools: Bash, Read, Write
metadata:
  credentials:
    - ADJUST_API_TOKEN
---

# Adjust Creative Performance

Pull mobile UA creative data from Adjust's KPI Service for performance analysis.

## Quick Start

```bash
# Creative performance (last 7 days)
ADJUST_API_TOKEN=$ADJUST_API_TOKEN python3 .claude/skills/adjust/scripts/creative-performance.py \
  --app-token abc1234xyz --days 7

# Date range
python3 .claude/skills/adjust/scripts/creative-performance.py \
  --app-token abc1234xyz --from 2026-02-01 --to 2026-02-23

# Save output
python3 .claude/skills/adjust/scripts/creative-performance.py \
  --app-token abc1234xyz --days 14 > /tmp/adjust-creatives.json
```

## Output Format

```json
{
  "meta": {
    "app_token": "abc1234xyz",
    "from": "2026-02-10",
    "to": "2026-02-23",
    "total_creatives": 18,
    "total_installs": 24500,
    "total_spend": 31200.00
  },
  "creatives": [
    {
      "creative": "hero_upgrade_15s_v2",
      "ad_id": "xyz123",
      "network": "Meta",
      "installs": 4200,
      "clicks": 18500,
      "impressions": 520000,
      "cost": 5040.00,
      "revenue": 8500.00,
      "cpi": 1.20,
      "ctr": 3.56,
      "cvr": 22.7,
      "ipm": 8.08,
      "roas": 1.69
    }
  ]
}
```

## Setup

1. Get API token: Adjust dashboard → **Account Settings** → API Token
2. Get app token: Adjust dashboard → **Apps** → select app → copy token (6-char alphanumeric)
3. Set env: `ADJUST_API_TOKEN=your_token`

## Typical Workflow

```bash
# Pull last 14 days of creative data
python3 .claude/skills/adjust/scripts/creative-performance.py \
  --app-token $APP_TOKEN --days 14 > /tmp/adjust.json

# Claude then reads /tmp/adjust.json and:
# 1. Classifies creatives (Winner/Stable/Warning/Fatigued) using IPM trends
# 2. Identifies high-spend underperformers
# 3. Generates creative briefs for replacements
# 4. Builds HTML performance dashboard
```

## Notes
- Adjust KPI Service returns aggregated data, not raw event logs
- Creative (ad) names come from `adname` dimension — ensure your ad naming convention in Adjust is consistent
- `revenue` requires Adjust revenue reporting to be set up (S2S purchase events)
- For daily IPM trends (fatigue detection), combine multiple API calls or use BigQuery datamart if available
