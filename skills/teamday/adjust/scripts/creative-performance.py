#!/usr/bin/env python3
"""
Adjust Creative Performance Report
Uses Adjust's KPI Service & Report Service APIs.

Usage:
  python3 creative-performance.py --app-token abc123 --days 7
  python3 creative-performance.py --app-token abc123 --from 2026-02-01 --to 2026-02-23

Env:
  ADJUST_API_TOKEN  - Adjust API token (user/account level)

Output: JSON with creative-level CPI, installs, clicks, impressions
"""

import os
import sys
import json
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timedelta

KPI_BASE = "https://api.adjust.com/kpis/v1"
REPORT_BASE = "https://api.adjust.com/reports/v2"


def fetch_kpis(app_token: str, from_date: str, to_date: str, api_token: str) -> dict:
    """
    Fetch KPI data from Adjust's KPI service.
    Grouped by creative (ad name) to get CPI/installs per creative.
    """
    params = urllib.parse.urlencode({
        "start_date": from_date,
        "end_date": to_date,
        "kpis": "installs,clicks,impressions,cost,revenue",
        "dimensions": "adid,adname,network",
        "attribution_type": "click",
        "currency": "USD",
        "sandbox": "false",
    })
    url = f"{KPI_BASE}/{app_token}.json?{params}"

    headers = {
        "Authorization": f"Token token={api_token}",
        "Accept": "application/json",
    }

    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        print(f"  HTTP {e.code}: {body[:200]}", file=sys.stderr)
        if e.code == 401:
            print("  ⚠ Invalid API token — check ADJUST_API_TOKEN", file=sys.stderr)
        return {}
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return {}


def parse_creatives(data: dict) -> list[dict]:
    """Parse Adjust KPI response into creative performance records."""
    creatives = []

    result_set = data.get("result_set", {})
    rows = result_set.get("rows", [])

    for row in rows:
        ad_name = row.get("adname") or row.get("ad_name") or "Unknown"
        ad_id = row.get("adid") or row.get("ad_id") or ""
        network = row.get("network", "Unknown")

        kpis = row.get("kpi_values", row)  # some versions nest, some don't
        installs = int(kpis.get("installs", 0) or 0)
        clicks = int(kpis.get("clicks", 0) or 0)
        impressions = int(kpis.get("impressions", 0) or 0)
        cost = float(kpis.get("cost", 0) or 0)
        revenue = float(kpis.get("revenue", 0) or 0)

        creative = {
            "creative": ad_name,
            "ad_id": ad_id,
            "network": network,
            "installs": installs,
            "clicks": clicks,
            "impressions": impressions,
            "cost": round(cost, 2),
            "revenue": round(revenue, 2),
            "cpi": round(cost / installs, 4) if installs > 0 else None,
            "ctr": round(clicks / impressions * 100, 2) if impressions > 0 else None,
            "cvr": round(installs / clicks * 100, 2) if clicks > 0 else None,
            "ipm": round(installs / impressions * 1000, 4) if impressions > 0 else None,
            "roas": round(revenue / cost, 4) if cost > 0 else None,
        }
        creatives.append(creative)

    creatives.sort(key=lambda x: x["installs"], reverse=True)
    return creatives


def main():
    parser = argparse.ArgumentParser(description="Adjust Creative Performance Report")
    parser.add_argument("--app-token", required=True, help="Adjust app token (from dashboard)")
    parser.add_argument("--from", dest="from_date", help="Start date YYYY-MM-DD")
    parser.add_argument("--to", dest="to_date", help="End date YYYY-MM-DD")
    parser.add_argument("--days", type=int, default=7, help="Last N days (default: 7)")
    args = parser.parse_args()

    api_token = os.environ.get("ADJUST_API_TOKEN", "")
    if not api_token:
        print("❌ ADJUST_API_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    today = datetime.utcnow().date()
    to_date = args.to_date or today.isoformat()
    from_date = args.from_date or (today - timedelta(days=args.days)).isoformat()

    print(f"\n📱 Adjust: {args.app_token}", file=sys.stderr)
    print(f"   Period: {from_date} → {to_date}", file=sys.stderr)
    print(f"   Fetching creative KPIs...", file=sys.stderr)

    data = fetch_kpis(args.app_token, from_date, to_date, api_token)

    if not data:
        print(json.dumps({"error": "no data", "creatives": []}))
        return

    creatives = parse_creatives(data)

    total_installs = sum(c["installs"] for c in creatives)
    total_spend = sum(c["cost"] for c in creatives)

    print(f"\n📊 Summary: {len(creatives)} creatives | {total_installs:,} installs | ${total_spend:,.2f} spend", file=sys.stderr)
    if total_installs > 0 and total_spend > 0:
        print(f"   Blended CPI: ${total_spend / total_installs:.2f}", file=sys.stderr)

    print(f"\n   Top 5:", file=sys.stderr)
    for c in creatives[:5]:
        cpi = f"${c['cpi']:.2f}" if c['cpi'] else "n/a"
        ipm = f"{c['ipm']:.1f}" if c['ipm'] else "n/a"
        print(f"   • {c['creative'][:40]:<40} | {c['installs']:>6} installs | CPI {cpi} | IPM {ipm}", file=sys.stderr)

    output = {
        "meta": {
            "app_token": args.app_token,
            "from": from_date,
            "to": to_date,
            "total_creatives": len(creatives),
            "total_installs": total_installs,
            "total_spend": round(total_spend, 2),
        },
        "creatives": creatives,
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
