# /teams SEO Strategy — Primary Focus

> **Core thesis**: TeamDay's product is AI teams that scale business execution, not headcount.
> The `/teams` section IS the product. Every SEO effort should be measured by how much it moves `/teams` traffic.

## Priority Order

1. **PRIMARY**: `/teams` (pillar) + `/teams/{slug}` (detail pages) — the product
2. **SECONDARY**: `/blog` — supports /teams with topical authority and internal links
3. **TERTIARY**: `/ai` (newsfeed) — brand awareness, not conversion-focused

## Strategic Positioning

**Homepage message**: "Scale Execution, Not Headcount"
**Teams message**: "AI Teams for Business — deploy full AI departments"

TeamDay is NOT:
- A chatbot platform
- A single AI assistant
- Another AI tool

TeamDay IS:
- Deployable AI departments (multiple agents collaborating)
- Connected to real business tools (Ahrefs, PostgreSQL, YouTube, etc.)
- Departments, not employees — the unit is a team, not an agent

## Current Teams (as of 2026-02)

### Available (live, working)
| Slug | Name | Category | Key Integrations |
|------|------|----------|------------------|
| `seo-office` | SEO Office | marketing | GSC, Ahrefs |
| `video-studio` | Video Studio | marketing | FAL AI, YouTube |
| `content-studio` | Content Studio | marketing | GSC, FAL, OpenAI |
| `data-analyst` | Data Analytics | data | PostgreSQL, BigQuery, MySQL, GA |

### Coming Soon (pages exist, not functional yet)
| Slug | Name | Category |
|------|------|----------|
| `social-media` | Social Media Team | marketing |
| `bdr-office` | BDR Office | sales |
| `email-marketing` | Email Marketing Team | marketing |
| `customer-support` | Customer Support Team | operations |
| `sales-office` | Sales Office | sales |
| `finance-office` | Finance Office | finance |
| `project-management` | Project Management Office | operations |
| `market-research` | Market Research Team | data |
| `hr-recruiting` | HR & Recruiting Team | hr |
| `legal-office` | Legal Office | legal |
| `quality-assurance` | Quality Assurance Team | engineering |
| `ppc-advertising` | PPC & Advertising Team | marketing |
| `supply-chain` | Supply Chain Team | operations |
| `workflow-automation` | Workflow Automation Team | operations |
| `real-estate` | Real Estate Office | sales |

## Keyword Strategy

### Target Keyword Clusters per Team

Each team page should own a keyword cluster. The pattern:
- **Primary**: `AI {function} team` / `AI {function} department`
- **Secondary**: `AI {tool} for {function}` / `automated {function}`
- **Long-tail**: `how to {outcome} with AI` / `AI {function} for {business type}`

#### SEO Office
- `ai seo team`, `ai seo analyst`, `automated seo reporting`
- `ai seo monitoring`, `ai ahrefs analysis`, `ai search console monitoring`
- `automated seo audit`, `ai seo for small business`

#### Video Studio
- `ai video team`, `ai video production`, `ai image to video`
- `ai video generator for business`, `automated video creation`
- `ai marketing video maker`, `ai product video creator`

#### Content Studio
- `ai content team`, `ai blog writing team`, `ai content production`
- `ai content translation`, `multilingual ai content`, `ai blog writer`
- `automated content creation for business`

#### Data Analytics
- `ai data analytics team`, `natural language to sql`, `ai business intelligence`
- `ai dashboard builder`, `ai data analyst for business`
- `automated business reporting`, `ai database query tool`

#### BDR Office
- `ai bdr team`, `ai lead generation`, `ai sales prospecting`
- `ai cold email writer`, `automated outbound sales`
- `ai business development`, `ai lead scoring tool`

#### Social Media Team
- `ai social media team`, `ai social media manager`, `ai social media content`
- `automated social media posting`, `ai social media for business`

#### Email Marketing Team
- `ai email marketing`, `ai email campaign`, `ai email automation`
- `automated email marketing`, `ai email copywriter`

#### Customer Support Team
- `ai customer support team`, `ai ticket triage`, `ai helpdesk`
- `automated customer support`, `ai support agent for business`

#### Finance Office
- `ai bookkeeping`, `ai finance team`, `ai accounting automation`
- `automated bookkeeping`, `ai financial reporting`

#### Project Management Office
- `ai project manager`, `ai sprint planning`, `ai project management tool`
- `automated status reports`, `ai task tracking`

(Expand for remaining teams as needed)

### Pillar Page (`/teams`) Keywords
- `ai teams for business`, `ai departments`, `hire ai team`
- `ai workforce`, `scale with ai teams`, `ai business automation teams`
- `deploy ai department`, `ai team platform`

## On-Page SEO Checklist (per team page)

Every `/teams/{slug}` page should have:

### Title Tags
- Format: `{Primary Keyword} — {Differentiator} | TeamDay`
- Example: `AI SEO Team — Automated Rankings, Traffic Analysis & Reporting | TeamDay`
- Keep under 60 characters
- Include the primary keyword for that team's cluster
- Use power words: automated, deploy, real-time, connected

### Meta Descriptions
- 150-160 characters
- Include primary + secondary keyword
- End with a value proposition or differentiator
- Example: "Deploy a complete AI SEO department. Monitors domain health via Ahrefs, analyzes Search Console data, and delivers weekly reports — on autopilot."

### H1 / H2 Structure
- H1: Team name (already in place)
- H2s should include target keywords naturally
- "What This Team Does" → consider "What the AI {Function} Team Does"
- "How It Works" → consider "How AI {Function} Works" or "How to Deploy an AI {Function} Team"

### FAQ Schema
- Already implemented with `<FAQSchema>` component
- FAQs should target "People Also Ask" queries
- Each FAQ answer should be comprehensive (50-100 words)
- Questions should match search intent: "What is...", "How does...", "Can AI..."

### Internal Linking
- Every blog post about a related topic should link to the relevant team page
- Cross-link between related teams (e.g., Content Studio ↔ SEO Office)
- Link from `/team/{character}` to `/teams/{team}` they belong to
- Homepage should link to `/teams` prominently

### Structured Data
- Already using `SoftwareApplication` schema — good
- Consider adding `Organization` or `Service` schema for team pages
- FAQ schema already in place

## Content Strategy Supporting /teams

### Blog posts that funnel to /teams
Every blog post should serve `/teams`. Pattern:
- "How to {solve problem} with AI" → CTA links to relevant team page
- "Best AI tools for {function}" → mention TeamDay's team as a solution
- "{Problem} solved: AI {function} teams" → direct funnel

### Topic clusters
Each team page is a pillar for its topic cluster:
- `/teams/seo-office` ← hub for SEO automation content
- `/teams/data-analyst` ← hub for AI business intelligence content
- `/teams/content-studio` ← hub for AI content creation content
- Blog posts link UP to team pages (not the other way around)

### Comparison/Alternative pages (high intent)
- "TeamDay vs hiring a {role}" (e.g., "vs hiring an SEO analyst")
- "AI {function} team vs freelancer"
- "TeamDay vs {competitor}" — only if competitors exist in the AI teams space

## Technical SEO for /teams

### URL Structure
- `/teams` — pillar (index)
- `/teams/{slug}` — detail pages
- Clean, keyword-rich slugs already in place

### Canonical URLs
- Already set on `[slug].vue` — `https://www.teamday.ai/teams/${slug}`
- Ensure i18n versions use `hreflang` and canonical correctly

### Page Speed
- Team pages are static data (SPACE_BLUEPRINTS) — SSR/SSG friendly
- Images: ensure cover images are optimized (WebP, lazy loading)
- Minimal JS — mostly static content

### Indexability
- Check: are all team pages in the sitemap?
- Check: no `noindex` on coming-soon pages (they should still be indexed)
- Check: robots.txt allows crawling of /teams/

## Measuring Success

### North Star Metrics
1. **Organic clicks to `/teams/*`** — currently ~0, target: 500/month in 3 months
2. **Impressions for "ai team" keyword cluster** — track weekly
3. **Average position for target keywords** — track per team page

### Leading Indicators
- Number of team pages indexed in Google (check via `site:teamday.ai/teams`)
- Keyword rankings for primary clusters (via Ahrefs/SE Ranking)
- Internal links pointing to `/teams/*` pages (count)
- Blog posts with CTAs to team pages (count)

### How to Check (use in every /seo run)
```
# Search Console: filter to /teams pages
mcp__search-console__query_search_analytics(
  startDate, endDate,
  dimensions: ["page"],
  dimensionFilterGroups: [{
    filters: [{ dimension: "page", operator: "contains", expression: "/teams/" }]
  }]
)

# Also check query-level data for teams
mcp__search-console__query_search_analytics(
  startDate, endDate,
  dimensions: ["query"],
  dimensionFilterGroups: [{
    filters: [{ dimension: "page", operator: "contains", expression: "/teams/" }]
  }]
)
```

## Action Playbook (Every /seo Run)

When the /seo skill is invoked, always:

1. **Check /teams performance first** — use the Search Console filters above
2. **Audit title tags and metas** — are they keyword-optimized and compelling?
3. **Check indexation** — are all team pages being crawled and indexed?
4. **Review internal linking** — are blog posts linking to team pages?
5. **Keyword research** — check rankings for target keyword clusters
6. **Propose improvements** — specific, actionable items for /teams pages
7. **Then (secondary)** check /blog and /ai performance

## Key Files

| What | Path |
|------|------|
| Teams pillar page | `packages/marketing/app/pages/teams/index.vue` |
| Team detail page | `packages/marketing/app/pages/teams/[slug].vue` |
| Team data (blueprints) | `packages/marketing/app/data/spaceBlueprints.ts` |
| Team card component | `packages/marketing/app/components/TeamBlueprintCard.vue` |
| Team members composable | `packages/marketing/app/composables/useTeamMembers.ts` |
| Homepage | `packages/marketing/app/pages/index.vue` |
| Nuxt config (sitemap) | `packages/marketing/nuxt.config.ts` |
| Robots.txt | `packages/marketing/public/robots.txt` |
