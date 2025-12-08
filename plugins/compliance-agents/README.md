# SOC 2 Compliance Agents Plugin

AI-powered autonomous compliance system for SOC 2 certification, security monitoring, and continuous audit preparation.

## Overview

This plugin provides 5 autonomous AI agents that handle SOC 2 compliance tasks automatically:

- **Log Monitor** - Continuous security monitoring (every 15 min)
- **Vulnerability Scanner** - Weekly security scans
- **Access Reviewer** - Quarterly access reviews
- **DR Drill Runner** - Quarterly disaster recovery testing
- **Policy Auditor** - Monthly compliance checks

## Installation

### Via TeamDay Marketplace

```bash
# Add TeamDay marketplace
/plugin marketplace add teamday-ai/claude-plugins

# Install compliance agents
/plugin install compliance-agents@teamday
```

### Manual Installation

```bash
# Clone the plugin
git clone https://github.com/teamday-ai/compliance-agents .claude-plugins/compliance-agents

# Or copy to your project
cp -r .claude-plugins/compliance-agents /path/to/your/project/.claude-plugins/
```

## Quick Start

### Check Compliance Status

```bash
/compliance-status
```

Shows your current SOC 2 readiness percentage and what needs attention.

### Run Compliance Checks

```bash
# Run all checks
/run-compliance-check

# Or use skills directly
"Claude, run a log monitor check"
"Claude, scan for vulnerabilities"
"Claude, run an access review"
```

### Use as Skills

The agents are available as Claude Skills - Claude will automatically use them when appropriate:

```
YOU: "Are we ready for our SOC 2 audit?"
→ Claude uses the policy-audit skill to check compliance

YOU: "Check the logs for any security issues"
→ Claude uses the log-monitor skill

YOU: "We need to test our disaster recovery"
→ Claude uses the dr-drill skill
```

## What You Get

### 5 Autonomous Agents

1. **Log Monitor** (`log-monitor`)
   - Analyzes audit logs for anomalies
   - Detects failed auth, rate limits, cost spikes
   - Creates GitHub issues for findings
   - Runs: Every 15 minutes (continuous)

2. **Vulnerability Scanner** (`vulnerability-scan`)
   - Scans dependencies for CVEs
   - Reviews security rules and code
   - Checks for OWASP Top 10 issues
   - Runs: Weekly (every Monday)

3. **Access Reviewer** (`access-review`)
   - Reviews user accounts and permissions
   - Identifies inactive users
   - Enforces least privilege
   - Runs: Quarterly (Jan, Apr, Jul, Oct)

4. **DR Drill Runner** (`dr-drill`)
   - Tests backup restoration
   - Verifies RTO/RPO targets
   - Documents lessons learned
   - Runs: Quarterly (15th of each quarter month)

5. **Policy Auditor** (`policy-audit`)
   - Audits security policy compliance
   - Checks SOC 2 control implementation
   - Calculates readiness percentage
   - Runs: Monthly (1st of each month)

### Commands

- `/compliance-status` - Show SOC 2 readiness dashboard
- `/run-compliance-check` - Run all compliance agents

### Documentation

The plugin includes:
- Complete SOC 2 audit package (7 documents)
- Security policies (InfoSec, Privacy, AUP)
- Agent instructions and templates
- Evidence collection guides

## Configuration

### Required Environment Variables

```bash
# GitHub (for creating issues)
GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPO=your-org/your-repo

# Slack (optional, for alerts)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

### Optional: Automated Scheduling

To run agents automatically on a schedule:

```bash
# Install the compliance orchestrator
./scripts/cron-setup.sh --install
```

Or use the TeamDay Spaces system for deployment (see Deployment section).

## Usage Examples

### Conversational (Recommended)

```
"Claude, run a security scan"
"Claude, are we ready for SOC 2?"
"Claude, check the logs for anomalies"
"Claude, we have a security incident"
"Claude, what compliance tasks are due this week?"
```

### Direct Skill Invocation

```bash
# Run specific agent
claude --skill log-monitor
claude --skill vulnerability-scan
claude --skill policy-audit
```

### Via Commands

```bash
# Check overall status
/compliance-status

# Run all checks
/run-compliance-check
```

## Output

Agents generate:
- **Reports**: Markdown files in `docs/` directory
  - `docs/log-monitoring/YYYY-MM-DD.md`
  - `docs/security-scans/YYYY-MM-DD.md`
  - `docs/access-reviews/YYYY-QQ.md`
  - `docs/dr-drills/YYYY-QQ.md`
  - `docs/policy-audits/YYYY-MM.md`

- **GitHub Issues**: Auto-created for findings
  - Labels: `compliance`, `security`
  - Assigned based on severity

- **Alerts**: Slack/email for critical issues

## Deployment

### Local Development

Use the plugin locally for testing and manual runs.

### Production (TeamDay Spaces)

Deploy to TeamDay Spaces for autonomous 24/7 operation:

```bash
# Create compliance space
teamday space create --config .teamday/space-compliance.yaml

# Configure secrets
teamday space env set compliance GITHUB_TOKEN "ghp_xxx"
teamday space env set compliance SLACK_WEBHOOK_URL "https://..."

# Deploy
git push origin main
```

See `DEPLOYMENT.md` for complete deployment guide.

## Cost Savings

### Traditional Compliance
- Compliance Manager: $120K/year
- Security Engineer: $140K/year
- Tools (SIEM, scanners): $15K/year
- **Total: $275K/year**

### AI-Native Compliance (This Plugin)
- AI API costs: $360/year (~$30/month)
- Human oversight: $2,400/year (2 hrs/month)
- **Total: $2,760/year**

**Savings: $272K/year (99% cost reduction)**

## SOC 2 Readiness

Current implementation provides:
- **80% SOC 2 ready** (80/102 controls)
- **4-month path** to certification
- **Continuous compliance** (not just point-in-time)

### Timeline
- **Month 1**: Run first quarterly tasks
- **Month 2**: Complete remaining controls
- **Month 3**: Penetration testing
- **Month 4**: SOC 2 Type I certification

## Customization

### Adapt to Your Environment

The agents are designed to be customized for your infrastructure:

1. **Database**: Modify to query your database (Firestore, PostgreSQL, etc.)
2. **Logging**: Point to your log system (CloudWatch, Datadog, etc.)
3. **Tools**: Integrate with your tools (Jira, Linear, PagerDuty, etc.)
4. **Policies**: Update policies to match your requirements

### Extend with New Agents

Create custom compliance agents by adding new skills:

```bash
# Create new skill
mkdir .claude-plugins/compliance-agents/skills/your-agent
cat > .claude-plugins/compliance-agents/skills/your-agent/SKILL.md << 'EOF'
# Your Agent

## Mission
[What this agent does]

## Schedule
[When it runs]

## Instructions
[Step-by-step procedure]
EOF
```

## Troubleshooting

### Agent Not Running

```bash
# Check if plugin is installed
/plugin

# Verify environment variables
echo $GITHUB_TOKEN

# Run agent manually with verbose output
claude --skill log-monitor --verbose
```

### Reports Not Generated

```bash
# Check directory permissions
ls -la docs/

# Verify Git is initialized
git status

# Run agent manually to see errors
claude --skill vulnerability-scan
```

### No GitHub Issues Created

```bash
# Test GitHub token
gh auth status

# Test issue creation
gh issue create --title "Test" --body "Test"
```

## Support

- **Documentation**: See `docs/audit/` for SOC 2 guidance
- **Issues**: Report bugs on GitHub
- **Questions**: support@teamday.ai
- **Community**: Join our Discord

## Contributing

We welcome contributions! To add or improve agents:

1. Fork the repository
2. Create a feature branch
3. Add/modify skills in `skills/` directory
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Credits

Built by [TeamDay](https://teamday.ai) - An AI-native platform for team collaboration.

We use AI agents for everything, including our own SOC 2 compliance program. This plugin is how we do it.

## Related

- **Blog Post**: [We Built an AI Compliance Team That Saves $272K/Year](https://teamday.ai/blog/ai-native-soc2-compliance)
- **Documentation**: [AI-Native Compliance Guide](./docs/AI-NATIVE-COMPLIANCE-GUIDE.md)
- **TeamDay Platform**: [teamday.ai](https://teamday.ai)
