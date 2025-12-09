# Log Monitor Skill

Execute the Log Monitor Agent to analyze logs for anomalies and security issues.

## When to Use

- User says "check the logs"
- User says "any anomalies?"
- User says "monitor logs"
- Continuous (every 15 minutes) - but user can trigger on-demand

## Instructions

1. **Read the agent instructions**:
   - Read `packages/agents/log-monitor/README.md`

2. **Gather log data**:
   - Firestore audit logs:
     - Read recent entries (last 1-24 hours depending on request)
     - Collections: `auditLogs`, `usageLogs`, `transactions`, `errors`
   - Application logs:
     - Search for error logs: `grep -r "ERROR\|error\|Error" packages --include="*.log"`
     - Search for warning logs: `grep -r "WARN\|warning" packages --include="*.log"`
   - System metrics (if available):
     - CPU/memory usage
     - Request rates
     - Error rates
     - AI API costs

3. **Analyze for security anomalies**:
   - **Authentication issues**:
     - Failed login attempts (> 5 per user per hour)
     - Multiple failed logins from same IP
     - Successful login after many failures (credential stuffing?)
     - Login from unusual location/device
   - **Authorization issues**:
     - Unauthorized access attempts (Firestore rule violations)
     - Privilege escalation attempts
     - Cross-org data access attempts
   - **Rate limiting**:
     - Users hitting rate limits (potential abuse)
     - Same IP making excessive requests
   - **Data access patterns**:
     - Unusual data downloads (large exports)
     - Access to sensitive data (API keys, billing info)
     - Data deletion (especially bulk deletes)

4. **Analyze for operational anomalies**:
   - **Error rates**:
     - Sudden spike in errors (> 2x baseline)
     - New error types (not seen before)
     - Errors affecting many users (systemic issue)
   - **Performance issues**:
     - Slow queries (> 5 seconds)
     - High CPU/memory usage
     - Database latency
   - **Cost anomalies**:
     - AI API spend spikes (> 2x baseline)
     - Unusual usage patterns (one user burning through credits)
   - **Agent execution**:
     - High failure rate (> 20%)
     - Long-running agents (> 5 minutes)
     - Resource limit violations

5. **Categorize findings by severity**:
   - **Critical**: Active security incident (ongoing attack, data breach)
   - **High**: Likely security issue (failed auth spike, unauthorized access)
   - **Medium**: Potential issue (performance degradation, cost spike)
   - **Low**: Informational (minor errors, usage trends)

6. **Generate alerts for critical/high issues**:
   - Create GitHub issue:
     - Title: "[SECURITY] Failed login spike from IP X.X.X.X"
     - Label: `security`, `incident`, `urgent`
     - Assign: Engineering Lead
     - Ping in Slack/email (if critical)
   - Follow Incident Response Plan if it's a real incident

7. **Create summary report**:
   - For on-demand checks: Immediate summary
   - For continuous monitoring: Weekly digest (every Friday)
   - Write to `docs/log-monitoring/YYYY-MM-DD-log-summary.md`
   - Include:
     - Time period analyzed
     - Total events processed
     - Anomalies detected (by severity)
     - Security incidents (if any)
     - Operational issues (if any)
     - Trends (week-over-week changes)
     - Recommendations

8. **Report to user**:
   - For on-demand: Full summary
   - For critical alerts: Immediate notification
   - For weekly digest: Email summary on Friday

## Expected Duration

5-10 minutes (automated)

## Output Format

**On-Demand Check**:
```markdown
👁️ Log Analysis Complete - Last 24 Hours

Time Period: Dec 7, 2025 00:00 - Dec 8, 2025 00:00
Events Analyzed: 15,234

Summary:
- Critical: 0 ✅
- High: 1 ⚠️
- Medium: 3
- Low: 8

Critical Issues:
(none)

High Priority:
- Failed login spike: 15 attempts from IP 203.0.113.42 targeting user admin@company.com
  - Action: Created issue #131, monitoring for 24h
  - Recommendation: Consider IP block if continues

Medium Priority:
- AI API cost spike: $45 today (average: $25)
  - Cause: User demo@company.com ran 50 agents today
  - Action: Monitoring, no action needed (legitimate use)

Low Priority:
- 8 minor errors in agent execution (timeout, rate limit)
  - All retried successfully
  - No user impact

Trends:
- Total requests: +12% week-over-week
- Error rate: 0.3% (baseline: 0.2%)
- AI spend: +20% week-over-week
- Active users: +5%

All clear! Just the one failed login spike to monitor.
```

**Weekly Digest**:
```markdown
📊 Weekly Log Summary - Week of Dec 1-7, 2025

Events Analyzed: 98,453
Incidents: 1 (resolved)
Anomalies Detected: 12 (3 high, 9 medium/low)

Security Summary:
- 1 failed login spike (resolved - user forgot password)
- 0 unauthorized access attempts
- 0 data breaches

Operational Summary:
- Error rate: 0.25% (stable)
- Average response time: 320ms (good)
- AI API spend: $180/week (budget: $250/week)
- Agent success rate: 92% (target: 90%)

Top Issues This Week:
1. Issue #131: Failed login spike (resolved)
2. Agent timeout errors (transient, no fix needed)
3. Slow query on transactions collection (investigating)

Trends:
- User growth: +8% (47 → 51 users)
- Agent usage: +15% (2,150 executions)
- AI spend: +12% ($160 → $180)

Full report: docs/log-monitoring/2025-12-07-weekly-summary.md
```

## Automation

For continuous monitoring (every 15 min):
- Run this skill automatically via cron or GitHub Actions
- Only alert on critical/high issues (don't spam for low-priority)
- Batch medium/low issues into weekly digest

Example cron:
```bash
*/15 * * * * claude --skill log-monitor --quiet >> /var/log/log-monitor.log 2>&1
```

## Notes

- This is the most frequent agent (runs every 15 min)
- Focus on actionable alerts (avoid false positives)
- Tune thresholds based on baseline (learn normal patterns first)
- Integrate with Slack/email for real-time critical alerts
- Consider using SIEM (Datadog, LogRocket) for advanced monitoring in future
