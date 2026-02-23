#!/usr/bin/env python3
"""
AppsFlyer Creative Performance Report
Pulls creative-level performance data using the Pull API.

Usage:
  python3 creative-performance.py --app-id com.example.game --from 2026-02-01 --to 2026-02-23
  python3 creative-performance.py --app-id com.example.game --days 30

Env:
  APPSFLYER_API_TOKEN  - AppsFlyer API token (V2.0 token from dashboard)

Output: JSON with creatives ranked by installs/CPI
"""

import os
import sys
import json
import csv
import argparse
import urllib.request
import urllib.parse
from datetime import datetime, timedelta
from io import StringIO

API_BASE = "https://hq1.appsflyer.com/api/raw-data/export/app"


def fetch_report(app_id: str, report_type: str, from_date: str, to_date: str, api_token: str) -> list[dict]:
    """Fetch a Pull API report and return as list of dicts."""
    params = urllib.parse.urlencode({
        "api_token": api_token,
        "from": from_date,
        "to": to_date,
        "timezone": "UTC",
        "currency": "preferred",
    })
    url = f"{API_BASE}/{app_id}/{report_type}/v5?{params}"

    print(f"  Fetching {report_type}...", file=sys.stderr)
    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        print(f"  HTTP {e.code}: {e.reason}", file=sys.stderr)
        if e.code == 401:
            print("  ⚠ Invalid API token — check APPSFLYER_API_TOKEN", file=sys.stderr)
        elif e.code == 403:
            print("  ⚠ Access denied — ensure Pull API is enabled for this app", file=sys.stderr)
        return []
    except Exception as e:
        print(f"  Error: {e}", file=sys.stderr)
        return []

    # Parse CSV response
    reader = csv.DictReader(StringIO(data))
    return list(reader)


def aggregate_by_creative(rows: list[dict]) -> list[dict]:
    """Aggregate install rows by creative, computing CPI and key metrics."""
    creatives: dict[str, dict] = {}

    for row in rows:
        # Creative identifier — AppsFlyer uses 'Ad' or 'Creative' column depending on the report
        creative_name = (
            row.get("Ad", "")
            or row.get("Creative", "")
            or row.get("Adset", "")
            or "Unknown"
        ).strip() or "Unknown"

        ad_network = row.get("Media Source", "Unknown")
        campaign = row.get("Campaign", "Unknown")
        country = row.get("Country Code", "")

        key = f"{creative_name}|{ad_network}"

        if key not in creatives:
            creatives[key] = {
                "creative": creative_name,
                "ad_network": ad_network,
                "campaign": campaign,
                "country_breakdown": {},
                "installs": 0,
                "clicks": 0,
                "impressions": 0,
                "cost": 0.0,
                "revenue": 0.0,
            }

        c = creatives[key]
        c["installs"] += int(row.get("Installs", 0) or 0)
        c["clicks"] += int(row.get("Clicks", 0) or 0)
        c["impressions"] += int(row.get("Impressions", 0) or 0)
        c["cost"] += float(row.get("Cost", 0) or 0)
        c["revenue"] += float(row.get("Revenue", 0) or 0)

        if country:
            c["country_breakdown"][country] = c["country_breakdown"].get(country, 0) + int(row.get("Installs", 0) or 0)

    # Compute derived metrics
    results = []
    for c in creatives.values():
        installs = c["installs"]
        cost = c["cost"]
        impressions = c["impressions"]
        clicks = c["clicks"]

        c["cpi"] = round(cost / installs, 4) if installs > 0 else None
        c["cpm"] = round(cost / impressions * 1000, 4) if impressions > 0 else None
        c["ctr"] = round(clicks / impressions * 100, 2) if impressions > 0 else None
        c["cvr"] = round(installs / clicks * 100, 2) if clicks > 0 else None
        c["ipm"] = round(installs / impressions * 1000, 4) if impressions > 0 else None
        c["roas"] = round(c["revenue"] / cost, 4) if cost > 0 else None
        c["cost"] = round(c["cost"], 2)
        c["revenue"] = round(c["revenue"], 2)
        results.append(c)

    # Sort by installs descending
    results.sort(key=lambda x: x["installs"], reverse=True)
    return results


def print_summary(creatives: list[dict]):
    """Print a human-readable summary to stderr."""
    print(f"\n📊 Creative Performance Summary", file=sys.stderr)
    print(f"   Total creatives: {len(creatives)}", file=sys.stderr)
    total_installs = sum(c["installs"] for c in creatives)
    total_spend = sum(c["cost"] for c in creatives)
    print(f"   Total installs: {total_installs:,}", file=sys.stderr)
    print(f"   Total spend: ${total_spend:,.2f}", file=sys.stderr)
    if total_installs > 0 and total_spend > 0:
        print(f"   Blended CPI: ${total_spend / total_installs:.2f}", file=sys.stderr)

    print(f"\n   Top 5 creatives by installs:", file=sys.stderr)
    for c in creatives[:5]:
        cpi_str = f"${c['cpi']:.2f}" if c['cpi'] else "n/a"
        ipm_str = f"{c['ipm']:.1f}" if c['ipm'] else "n/a"
        print(f"   • {c['creative'][:40]:<40} | {c['installs']:>6} installs | CPI {cpi_str} | IPM {ipm_str}", file=sys.stderr)


def main():
    parser = argparse.ArgumentParser(description="AppsFlyer Creative Performance Report")
    parser.add_argument("--app-id", required=True, help="AppsFlyer app ID (e.g. com.example.game)")
    parser.add_argument("--from", dest="from_date", help="Start date YYYY-MM-DD")
    parser.add_argument("--to", dest="to_date", help="End date YYYY-MM-DD (default: today)")
    parser.add_argument("--days", type=int, default=7, help="Last N days (default: 7, used if --from not set)")
    parser.add_argument("--output", default="json", choices=["json", "csv"], help="Output format")
    args = parser.parse_args()

    api_token = os.environ.get("APPSFLYER_API_TOKEN", "")
    if not api_token:
        print("❌ APPSFLYER_API_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    today = datetime.utcnow().date()
    to_date = args.to_date or today.isoformat()
    from_date = args.from_date or (today - timedelta(days=args.days)).isoformat()

    print(f"\n📱 AppsFlyer: {args.app_id}", file=sys.stderr)
    print(f"   Period: {from_date} → {to_date}", file=sys.stderr)

    # Pull non-organic installs (where creatives live)
    rows = fetch_report(args.app_id, "installs_report", from_date, to_date, api_token)

    if not rows:
        print("⚠ No data returned. Check app ID, date range, and API token.", file=sys.stderr)
        print(json.dumps({"creatives": [], "meta": {"app_id": args.app_id, "from": from_date, "to": to_date, "error": "no data"}}))
        return

    creatives = aggregate_by_creative(rows)
    print_summary(creatives)

    output = {
        "meta": {
            "app_id": args.app_id,
            "from": from_date,
            "to": to_date,
            "total_creatives": len(creatives),
            "total_installs": sum(c["installs"] for c in creatives),
            "total_spend": round(sum(c["cost"] for c in creatives), 2),
        },
        "creatives": creatives,
    }

    if args.output == "json":
        print(json.dumps(output, indent=2))
    else:
        if creatives:
            writer = csv.DictWriter(sys.stdout, fieldnames=creatives[0].keys())
            writer.writeheader()
            writer.writerows(creatives)


if __name__ == "__main__":
    main()
