# Policy Audit Skill

Execute the Policy Auditor Agent to verify compliance with security policies.

## When to Use

- User says "run a policy audit"
- User says "check compliance"
- User says "are we SOC 2 ready?"
- Monthly (1st of each month)

## Instructions

1. **Read the agent instructions**:
   - Read `packages/agents/policy-auditor/README.md`

2. **Read the policies to audit against**:
   - Information Security Policy: `docs/policies/information-security-policy.md`
   - Privacy Policy: `docs/policies/privacy-policy.md`
   - Acceptable Use Policy: `docs/policies/acceptable-use-policy.md`
   - SOC 2 Controls Matrix: `docs/audit/soc2-controls-matrix.md`

3. **Audit each policy area**:

   ### Access Control (InfoSec Policy Section 4)
   - ✅ MFA required for production access? (Check Firebase, GitHub, Cloudflare settings)
   - ✅ Role-based access control enforced? (Check Firestore rules)
   - ✅ Quarterly access reviews conducted? (Check docs/access-reviews/ for recent reports)
   - ✅ Account deprovisioning within 24h? (Check for any pending removals)

   ### Data Protection (InfoSec Policy Section 5)
   - ✅ Encryption at rest (AES-256-GCM)? (Check encryption code in codebase)
   - ✅ Encryption in transit (TLS 1.3)? (Check server config)
   - ✅ No secrets in code? (Scan for hardcoded secrets)
   - ✅ Backup retention (30 days)? (Check Firebase backup config)
   - ✅ Data deletion honors 30-day grace period? (Check deletion code)

   ### System Security (InfoSec Policy Section 6)
   - ✅ Firestore rules enforced? (Check rules file exists and is deployed)
   - ✅ Weekly vulnerability scans? (Check docs/security-scans/ for recent reports)
   - ✅ Dependencies updated within SLA? (Check for outdated packages with known CVEs)
   - ✅ Sandbox isolation working? (Check agent execution code)

   ### Change Management (InfoSec Policy Section 7)
   - ✅ All changes in Git? (Check commit history)
   - ✅ Code review required? (Check GitHub branch protection)
   - ✅ Automated tests run? (Check GitHub Actions)
   - ✅ Deployment audit trail? (Check deployment logs)

   ### Monitoring & Logging (InfoSec Policy Section 8)
   - ✅ Audit logs enabled? (Check auditLogs collection)
   - ✅ 2-year retention? (Check log retention config)
   - ✅ Log monitoring every 15 min? (Check Log Monitor Agent runs)
   - ✅ Incident response plan exists? (Check docs/audit/incident-response-plan.md)

   ### Vendor Management (InfoSec Policy Section 9)
   - ✅ All vendors have SOC 2 reports? (Check vendor list, verify reports exist)
   - ✅ DPAs signed? (Check contracts)
   - ✅ Annual vendor reviews? (Check docs/vendor-reviews/ for recent reports)

   ### Disaster Recovery (InfoSec Policy Section 10)
   - ✅ Daily backups? (Check Firebase backup config)
   - ✅ Quarterly DR drills? (Check docs/dr-drills/ for recent reports)
   - ✅ RTO/RPO documented? (Check DR plan)

   ### Privacy (Privacy Policy)
   - ✅ Data export feature works? (Test export functionality)
   - ✅ Data deletion works? (Test deletion functionality)
   - ✅ AI provider data policies documented? (Check Privacy Policy section 4.2)
   - ✅ Cookie consent? (Check website)

   ### Acceptable Use (AUP)
   - ✅ Content moderation exists? (Check for abuse detection)
   - ✅ Rate limits enforced? (Check rate limiting code)
   - ✅ Abuse reporting mechanism? (Check abuse/report email exists)

4. **Check SOC 2 controls**:
   - Read `docs/audit/soc2-controls-matrix.md`
   - For each control marked "Implemented":
     - Verify it actually exists (code, config, documentation)
     - Check it's working (test if possible, check logs)
   - For controls marked "Partial":
     - Document what's missing
     - Create remediation plan
   - For controls marked "Not Implemented":
     - Document why (planned, not applicable, etc.)

5. **Document violations**:
   - **Critical**: Control failures that expose data/systems (missing encryption, no auth)
   - **High**: Policy violations with security impact (missing access review, outdated vulns)
   - **Medium**: Process gaps (missing documentation, late reports)
   - **Low**: Minor compliance issues (formatting, outdated dates)

6. **Create remediation plan**:
   - For each violation:
     - What's broken?
     - Why does it matter? (compliance requirement, security risk)
     - How to fix it? (specific steps)
     - Who should fix it? (owner)
     - When to fix it? (deadline based on severity)

7. **Create compliance report**:
   - Write to `docs/policy-audits/YYYY-MM-policy-audit.md`
   - Use template from agent README
   - Include:
     - Audit scope (what was checked)
     - Audit methodology (how it was checked)
     - Findings (by policy area, by severity)
     - SOC 2 readiness score (% of controls implemented)
     - Remediation plan
     - Timeline to full compliance
     - Sign-off section

8. **Create GitHub issues for violations**:
   - Critical/High: Separate issues
   - Medium/Low: Batch into one issue per policy area
   - Label: `compliance`, `policy`, `soc2`
   - Milestone: "SOC 2 Certification" (April 2026)

9. **Report to user**:
   - Summarize audit results
   - Highlight critical gaps
   - Estimate readiness % for SOC 2
   - Link to full report
   - Link to remediation issues

## Expected Duration

30-45 minutes (automated)

## Output Format

```markdown
📋 Policy Audit Complete - December 2025

Audit Period: December 1-8, 2025
Policies Audited: 3 (InfoSec, Privacy, AUP)
SOC 2 Controls Checked: 102

SOC 2 Readiness: 78% (80/102 controls) ⚠️

Summary:
- Critical violations: 0 ✅
- High priority: 3 ⚠️
- Medium priority: 7
- Low priority: 12

Critical Issues:
(none)

High Priority (Fix This Month):
- Issue #132: Quarterly access review overdue (last: Q3, due: Q4)
- Issue #133: DR drill not conducted (last: July, due: October)
- Issue #134: Missing vendor SOC 2 report (Paddle report expired)

Medium Priority:
- 7 documentation gaps (policies need updates)

Low Priority:
- 12 minor compliance issues (formatting, dates)

SOC 2 Readiness Breakdown:
✅ CC1 (Control Environment): 100% (12/12 controls)
✅ CC2 (Communication): 100% (3/3 controls)
⚠️  CC3 (Risk Management): 70% (7/10 controls) - Missing risk register updates
⚠️  CC4 (Monitoring): 75% (6/8 controls) - Need SIEM
✅ CC5 (Control Activities): 85% (17/20 controls)
✅ CC6 (Logical Access): 90% (18/20 controls)
✅ CC7 (System Operations): 80% (16/20 controls)
⚠️  CC8 (Change Management): 75% (6/8 controls) - Need formal change approval

Gaps to Fix Before SOC 2 Audit (April 2026):
1. Conduct Q4 access review (Issue #132)
2. Run Q4 DR drill (Issue #133)
3. Get vendor SOC 2 reports (Issue #134)
4. Implement SIEM or enhanced monitoring
5. Formal change approval process
6. Risk register updates

Timeline:
- January: Fix high-priority issues → 85% ready
- February: Fix medium-priority → 92% ready
- March: Final polish → 95% ready
- April: Audit → Certification ✅

Report: docs/policy-audits/2025-12-policy-audit.md
Next audit: January 1, 2026
```

## Notes

- Run monthly (1st of each month) to track progress
- Focus on SOC 2 readiness (that's the goal)
- Don't just check boxes - verify controls actually work
- Celebrate progress (80% ready is great for 3 months out!)
- Use audit results to guide prioritization (fix critical/high first)
