# DR Drill Skill

Execute the DR Drill Runner Agent to test disaster recovery procedures.

## When to Use

- User says "run a disaster recovery drill"
- User says "test backups"
- User says "DR drill"
- Quarterly (15th of Jan, Apr, Jul, Oct)

## Instructions

1. **Read the agent instructions**:
   - Read `packages/agents/dr-drill-runner/README.md`

2. **Pre-drill preparation**:
   - Document current production state:
     - Number of users/orgs
     - Recent data changes (last 24 hours)
     - Current uptime
   - Notify team (Slack/email): "DR drill starting, expect brief service interruption"
   - Set maintenance mode (if available)

3. **Execute drill scenarios** (choose one per quarter):

   **Scenario A: Database Restore (Q1, Q3)**
   - List available Firestore backups:
     ```bash
     gcloud firestore backups list --project=[YOUR_PROD_PROJECT]
     ```
   - Select most recent backup
   - Restore to test environment (NOT production):
     ```bash
     gcloud firestore restore --project=[YOUR_TEST_PROJECT] --backup=[BACKUP_ID]
     ```
   - Verify data integrity:
     - Check user count matches
     - Spot-check recent data (last 24 hours)
     - Verify relationships (orgs → users → agents)
   - Measure recovery time (start to finish)
   - Cleanup: Delete test environment data

   **Scenario B: Application Redeployment (Q2, Q4)**
   - Simulate application failure (don't actually break production!)
   - Redeploy from Git:
     ```bash
     cd packages/app
     git pull
     bun install
     bun run build
     # Deploy to staging first
     firebase deploy --only hosting:staging
     # Verify staging works
     # Then deploy to production
     firebase deploy --only hosting:production
     ```
   - Verify application health:
     - Homepage loads
     - Authentication works
     - Database queries work
     - Agent execution works
   - Measure recovery time

4. **Test recovery procedures**:
   - Follow documented DR procedures (if they exist)
   - Document any deviations or issues
   - Time each step

5. **Verify data integrity**:
   - Check critical data:
     - User accounts
     - Organization data
     - Recent transactions
     - Audit logs
   - Spot-check 10 random records
   - Verify no data loss

6. **Measure success criteria**:
   - **RTO (Recovery Time Objective)**: Target 4 hours, actual?
   - **RPO (Recovery Point Objective)**: Target 24 hours (last backup), actual?
   - **Data integrity**: 100% (no corruption/loss)?
   - **Service restoration**: All features working?

7. **Document lessons learned**:
   - What went well?
   - What went wrong?
   - What was harder than expected?
   - What documentation was missing?
   - What procedures need updating?

8. **Update DR procedures**:
   - Fix outdated steps
   - Add missing steps
   - Clarify ambiguous instructions
   - Update time estimates

9. **Create drill report**:
   - Write to `docs/dr-drills/YYYY-QQ-dr-drill.md`
   - Use template from agent README
   - Include:
     - Drill scenario
     - Execution timeline (step-by-step with timestamps)
     - Success metrics (RTO, RPO, integrity)
     - Issues encountered
     - Lessons learned
     - Action items (procedure updates, tool improvements)
     - Sign-off section (Engineering Lead approval)

10. **Create GitHub issues for improvements**:
    - Label: `ops`, `disaster-recovery`
    - Examples:
      - "Update DR procedure documentation"
      - "Improve backup verification scripts"
      - "Reduce recovery time (current: 6 hours, target: 4 hours)"

11. **Report to user**:
    - Summarize drill results
    - Highlight successes and issues
    - Link to full report
    - Link to improvement issues

## Expected Duration

1-2 hours (hands-on)

## Output Format

```markdown
🔥 DR Drill Complete - Q4 2025

Scenario: Database Restore from Backup
Date: October 15, 2025
Duration: 1 hour 45 minutes

Success Metrics:
- RTO: 1h 45min ✅ (target: 4 hours)
- RPO: 18 hours ✅ (target: 24 hours)
- Data integrity: 100% ✅
- Service restoration: All features working ✅

What Went Well:
- Backup restore completed in 45 minutes
- No data loss detected
- Team coordination was smooth

Issues Encountered:
- Documentation for backup restore was outdated
- Verification script had a bug (fixed during drill)
- Test environment credentials expired (needed reset)

Lessons Learned:
- Need to test backups more frequently (monthly spot checks)
- Verification scripts should be tested before drill
- Test environment credentials should auto-rotate

Action Items:
- Issue #128: Update DR procedure documentation
- Issue #129: Fix verification script bug
- Issue #130: Automate test environment setup

Report: docs/dr-drills/2025-Q4-dr-drill.md
Next drill: January 15, 2026
```

## Safety Notes

- **NEVER test on production** (use staging/test environment)
- **Notify team before starting** (avoid surprise outages)
- **Have rollback plan** (if drill breaks something)
- **Document everything** (even failed steps)
- If drill goes wrong, STOP and escalate to Engineering Lead

## Required Access

- Firestore backup access (gcloud CLI configured)
- Firebase deployment access
- Test/staging environment
- Git repository access

If access is missing, document in report and create issue to fix access before next drill.
