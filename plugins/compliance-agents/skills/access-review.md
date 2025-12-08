# Access Review Skill

Execute the Access Reviewer Agent to conduct quarterly access reviews.

## When to Use

- User says "run an access review"
- User says "check user access"
- User says "quarterly access review"
- Every quarter (Jan 1, Apr 1, Jul 1, Oct 1)

## Instructions

1. **Read the agent instructions**:
   - Read `packages/agents/access-reviewer/README.md`

2. **Gather data sources**:
   - Read Firestore security rules: `packages/app/firestore.rules`
   - Search for auth code: `grep -r "FirebaseAuth\|signIn\|requireAuth" packages/app --include="*.ts" --include="*.vue"`
   - Find user management code: `grep -r "addMember\|removeMember\|updateRole" packages/app --include="*.ts"`

3. **Execute the review checklist** (from agent README):
   - List all active users (search for user data structures)
   - Review role assignments (owner, admin, member, viewer)
   - Check for inactive users (look for lastLoginAt fields)
   - Verify least privilege (roles match job functions)
   - Check for shared accounts (multiple people using one account)
   - Review privileged access (admins, owners)

4. **Generate findings**:
   - Create a list of action items (e.g., "Remove inactive user X", "Downgrade user Y from admin to member")
   - Assign severity: Critical (shared accounts, unauthorized admins), High (inactive users with admin), Medium (cleanup)

5. **Create report**:
   - Write report to `docs/access-reviews/YYYY-QQ-access-review.md`
   - Use the template from the agent README
   - Include:
     - Executive summary
     - Review scope
     - Findings (with severity)
     - Action items (with owners and due dates)
     - Sign-off section

6. **Create GitHub issues for action items**:
   - Use `gh issue create` for each finding
   - Label: `security`, `compliance`, `access-review`
   - Assign to appropriate owner

7. **Report to user**:
   - Summarize findings
   - Highlight critical issues
   - Link to full report
   - Link to GitHub issues

## Expected Duration

5-15 minutes (automated)

## Output Format

```markdown
✅ Access Review Complete - Q4 2025

Summary:
- Total users reviewed: 42
- Active users: 38
- Inactive users: 4
- Role changes needed: 2
- Critical findings: 0
- High priority: 1
- Medium priority: 3

Critical Issues:
(none)

High Priority:
- Issue #123: Remove inactive admin account (john@example.com, last login 6 months ago)

Medium Priority:
- Issue #124: Downgrade user to member (no longer needs admin)
- Issue #125: Clean up 2 inactive viewer accounts

Report: docs/access-reviews/2025-Q4-access-review.md
```

## Notes

- This is a quarterly task (Jan, Apr, Jul, Oct)
- If no users exist yet (early stage), document "No users to review" and skip
- If Firebase Admin SDK access is needed, ask user to set up service account
- Focus on security risks (shared accounts, excessive permissions) over minor cleanup
