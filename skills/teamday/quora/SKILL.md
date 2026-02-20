---
name: quora
description: Search Quora for relevant questions and draft authoritative, helpful responses. Quora answers are evergreen and often rank on Google page 1 — high-ROI thought leadership channel.
allowed-tools: Bash, Read, Write, WebSearch, WebFetch
env: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
---

# Quora Engagement Skill

Find high-value Quora questions and draft expert responses. Quora answers accumulate views for years and frequently rank on Google page 1 — making it a high-ROI channel for thought leadership.

## When to Use

- User asks to find Quora questions about their industry or product
- User wants to find engagement opportunities on Quora
- User asks to draft an answer to a Quora question
- User says "check Quora" or "find Quora questions"
- Periodic content marketing via expert Q&A

## Scripts

### Search for Quora Questions

```bash
bun .claude/skills/quora/scripts/quora-search.ts "<query>" [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--limit=N` | 10 | Number of results (max 30) |
| `--location=CODE` | 2840 | DataForSEO location code (2840=US) |

Uses DataForSEO Google SERP API with `site:quora.com` to find relevant questions.

### Read a Quora Question + Answers

```bash
bun .claude/skills/quora/scripts/quora-read.ts "<quora-url>" [options]
```

| Option | Default | Description |
|--------|---------|-------------|
| `--method=VALUE` | auto | `auto`, `fetch`, `cache`, or `browser` |

Tiered fallback: direct fetch > Google cache > browser automation.

## Workflow

### Phase 1: Discovery

Run targeted searches across relevant topics:

```bash
# Direct product-fit keywords
bun .claude/skills/quora/scripts/quora-search.ts "your product category" --limit=10

# Problem-aware keywords
bun .claude/skills/quora/scripts/quora-search.ts "how to automate [your use case]" --limit=10

# Comparison keywords
bun .claude/skills/quora/scripts/quora-search.ts "best tools for [your category] 2026" --limit=10
```

### Phase 2: Qualify Opportunities

**High-value questions (prioritize):**
- Question ranks on Google page 1 (position 1-10)
- Few existing answers or answers are outdated
- Question has broad appeal
- Question asks for tool recommendations or comparisons
- Question describes a pain point your product solves

**Skip these:**
- Questions with 20+ detailed, recent answers (saturated)
- Very narrow/specific questions unrelated to your domain
- Questions that are just complaints or rants
- Questions where the top answer is already perfect and recent

### Phase 3: Deep-Read Promising Questions

```bash
bun .claude/skills/quora/scripts/quora-read.ts "https://www.quora.com/Your-Question-URL"
```

Understand:
1. What is the asker actually looking for?
2. What answers already exist? Are they good or outdated?
3. Is there a gap you could fill with a fresh, expert perspective?
4. What's the tone of existing answers?

### Phase 4: Draft Response

**Tone Guidelines:**
- Write as an industry expert, not a marketer
- Be comprehensive and authoritative — Quora rewards detailed answers
- Use clear structure (headers, numbered lists, bold key points)
- Only mention your product where genuinely relevant — as one option among others
- Share real insights and specific, actionable advice

**Response Structure (300-600 words):**
1. **Hook** — Strong opening that directly addresses the question
2. **Context/Framework** — Useful context or a framework for thinking about the problem
3. **Detailed Answer** — Specific, actionable advice with examples
4. **Product mention (if relevant)** — Brief, natural mention as one approach among others
5. **Closing** — Forward-looking statement or invitation to discuss further

**Formatting Tips for Quora:**
- Use **bold** for key terms and takeaways
- Use numbered lists for steps or ranked items
- Use short paragraphs (2-3 sentences max)
- Include a personal angle ("In my experience...")
- End with a question or invitation to engage

### Phase 5: Report

Present findings as a structured engagement report with search queries, top opportunities, draft responses, and recommended follow-up searches.

## Rate Limits & Costs

- DataForSEO Google SERP: ~$0.001-0.0025 per request
- Quora page reading via fetch/cache is free; browser fallback uses local Chrome

## Saving Results

Save engagement reports to track progress:
```
docs/quora/YYYY-MM-DD-quora-engagement.md
```
