---
description: Show SOC 2 compliance readiness status and upcoming tasks
---

# Compliance Status Command

Display the current SOC 2 compliance readiness status, including:
- Overall readiness percentage
- Controls implemented vs. total
- Critical gaps that need attention
- Upcoming compliance tasks
- Recent agent runs and findings

## Instructions

1. **Calculate SOC 2 Readiness**:
   - Read the controls matrix: `docs/audit/soc2-controls-matrix.md`
   - Count controls marked as "Implemented" vs. total controls
   - Calculate percentage: (implemented / total) × 100

2. **Check Critical Gaps**:
   - Read the readiness checklist: `docs/audit/soc2-readiness-checklist.md`
   - List any items marked as "Critical" that aren't complete
   - List any "High" priority items overdue

3. **List Upcoming Tasks**:
   - Check the schedule in `.teamday/space-compliance.yaml`
   - Identify what's due in the next 30 days
   - Prioritize by: Critical → High → Medium → Low

4. **Review Recent Activity**:
   - Check for recent reports in `docs/` subdirectories
   - Show last run date for each agent
   - Highlight any open GitHub issues labeled "compliance"

5. **Generate Dashboard**:
   Present the information as a clear, actionable dashboard:

```markdown
🎯 SOC 2 Compliance Status

Overall Readiness: ████████████████░░░░ 80% (80/102 controls)

Critical Gaps (Must Fix):
- None ✅

High Priority (Fix Soon):
- Quarterly access review overdue (last: Q3, due: Q4)
- DR drill needed (last: July, due: October)

Upcoming Tasks (Next 30 Days):
- Jan 1: Access Review (automated)
- Jan 1: Policy Audit (automated)
- Jan 15: DR Drill (automated)

Recent Agent Activity:
- Log Monitor: Running continuously ✅ (last: 5 min ago)
- Vulnerability Scanner: Last run Dec 4 ✅ (0 critical, 2 high)
- Access Review: Pending (due Jan 1)
- DR Drill: Pending (due Jan 15)
- Policy Audit: Last run Dec 1 ✅ (readiness: 80%)

Open Issues:
- Issue #132: Dependency update needed (high priority)
- Issue #133: Documentation gap (medium priority)

🎉 Status: On track for April 2026 certification!

Next action: Review high-priority issues above
```

Make the output clear, actionable, and encouraging. Celebrate progress while highlighting what needs attention.
