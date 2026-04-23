#!/usr/bin/env python3
"""
AppsFlyer Creative Daily Trends
Pulls daily creative performance to detect fatigue (IPM decline over time).

Usage:
  python3 creative-trends.py --app-id com.example.game --days 14

Output: JSON with daily IPM per creative, fatigue status
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
from collections import defaultdict

API_BASE = "https://hq1.appsflyer.com/api/raw-data/export/app"
WARNING_THRESHOLD = 0.20   # 20% IPM drop from peak → Warning
FATIGUE_THRESHOLD = 0.30   # 30% IPM drop from peak → Fatigued


def fetch_daily_report(app_id: str, from_date: str, to_date: str, api_token: str) -> list[dict]:
    params = urllib.parse.urlencode({
        "api_token": api_token,
        "from": from_date,
        "to": to_date,
        "timezone": "UTC",
        "currency": "preferred",
    })
    url = f"{API_BASE}/{app_id}/installs_report/v5?{params}"

    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = resp.read().decode("utf-8")
    except Exception as e:
        print(f"Error fetching data: {e}", file=sys.stderr)
        return []

    return list(csv.DictReader(StringIO(data)))


def classify_fatigue(daily_ipm: list[float]) -> str:
    """Classify creative based on IPM trend."""
    if len(daily_ipm) < 3:
        return "Insufficient data"
    valid = [x for x in daily_ipm if x is not None and x > 0]
    if not valid:
        return "No impressions"

    peak = max(valid)
    recent_avg = sum(valid[-3:]) / min(3, len(valid))

    if peak == 0:
        return "No impressions"

    drop_pct = (peak - recent_avg) / peak
    if drop_pct >= FATIGUE_THRESHOLD:
        return "Fatigued"
    elif drop_pct >= WARNING_THRESHOLD:
        return "Warning"
    elif recent_avg > peak * 0.95:
        return "Winner"
    else:
        return "Stable"


def main():
    parser = argparse.ArgumentParser(description="AppsFlyer Creative Fatigue Tracker")
    parser.add_argument("--app-id", required=True, help="AppsFlyer app ID")
    parser.add_argument("--days", type=int, default=14, help="Days to analyze (default: 14)")
    args = parser.parse_args()

    api_token = os.environ.get("APPSFLYER_API_TOKEN", "")
    if not api_token:
        print("❌ APPSFLYER_API_TOKEN not set", file=sys.stderr)
        sys.exit(1)

    today = datetime.utcnow().date()
    from_date = (today - timedelta(days=args.days)).isoformat()
    to_date = today.isoformat()

    print(f"📱 Fetching {args.days}-day trends for {args.app_id}...", file=sys.stderr)
    rows = fetch_daily_report(args.app_id, from_date, to_date, api_token)

    if not rows:
        print(json.dumps({"error": "no data", "creatives": []}))
        return

    # Group by creative + date
    # key: (creative_name, ad_network), value: {date: {installs, impressions}}
    creative_daily: dict = defaultdict(lambda: defaultdict(lambda: {"installs": 0, "impressions": 0}))

    for row in rows:
        creative = (row.get("Ad") or row.get("Creative") or row.get("Adset") or "Unknown").strip()
        network = row.get("Media Source", "Unknown")
        date = row.get("Install Time", row.get("Date", ""))[:10]  # YYYY-MM-DD
        if not date:
            continue

        key = (creative, network)
        creative_daily[key][date]["installs"] += int(row.get("Installs", 0) or 0)
        creative_daily[key][date]["impressions"] += int(row.get("Impressions", 0) or 0)

    # Build date range
    dates = []
    for i in range(args.days):
        d = (today - timedelta(days=args.days - 1 - i)).isoformat()
        dates.append(d)

    # Build output per creative
    results = []
    for (creative, network), daily in creative_daily.items():
        daily_ipm = []
        daily_data = []
        for date in dates:
            d = daily.get(date, {"installs": 0, "impressions": 0})
            ipm = round(d["installs"] / d["impressions"] * 1000, 2) if d["impressions"] > 0 else None
            daily_ipm.append(ipm)
            daily_data.append({
                "date": date,
                "installs": d["installs"],
                "impressions": d["impressions"],
                "ipm": ipm,
            })

        total_installs = sum(d["installs"] for d in daily_data)
        if total_installs == 0:
            continue  # skip inactive creatives

        status = classify_fatigue(daily_ipm)
        valid_ipm = [x for x in daily_ipm if x is not None]
        peak_ipm = max(valid_ipm) if valid_ipm else 0
        current_ipm = sum(x for x in daily_ipm[-3:] if x is not None) / max(1, sum(1 for x in daily_ipm[-3:] if x is not None))

        results.append({
            "creative": creative,
            "ad_network": network,
            "status": status,
            "total_installs": total_installs,
            "peak_ipm": round(peak_ipm, 2),
            "current_ipm": round(current_ipm, 2),
            "ipm_drop_pct": round((peak_ipm - current_ipm) / peak_ipm * 100, 1) if peak_ipm > 0 else 0,
            "daily": daily_data,
        })

    # Sort: Fatigued first, then Warning, then by installs
    status_order = {"Fatigued": 0, "Warning": 1, "Stable": 2, "Winner": 3, "Insufficient data": 4, "No impressions": 5}
    results.sort(key=lambda x: (status_order.get(x["status"], 9), -x["total_installs"]))

    # Summary to stderr
    by_status = defaultdict(int)
    for r in results:
        by_status[r["status"]] += 1

    print(f"\n📊 Fatigue Analysis ({from_date} → {to_date})", file=sys.stderr)
    print(f"   Active creatives: {len(results)}", file=sys.stderr)
    for status, count in sorted(by_status.items()):
        emoji = {"Fatigued": "🔴", "Warning": "🟡", "Winner": "🟢", "Stable": "🔵"}.get(status, "⚪")
        print(f"   {emoji} {status}: {count}", file=sys.stderr)

    print(json.dumps({
        "meta": {"app_id": args.app_id, "from": from_date, "to": to_date, "days": args.days},
        "summary": dict(by_status),
        "creatives": results,
    }, indent=2))


if __name__ == "__main__":
    main()
