# Programmatic SEO

> Source: marketingskills/programmatic-seo
> Use for: Building SEO-optimized pages at scale using templates and data

## When to Use

- Building glossary/dictionary pages
- Creating comparison pages at scale
- Generating location-based landing pages
- Building integration pages
- Creating "tools like X" or alternatives pages
- Scaling content production

## Core Principle

**"Every page must provide value specific to that page"** - Not just variable swapping in templates.

Success requires:
- Proprietary or curated data
- Genuine search intent matching
- Unique value per page
- Quality over quantity

## 12 Proven Playbooks

### 1. Templates
Downloadable assets users need immediately.
- Resume templates
- Contract templates
- Email templates

**Example:** `/templates/sales-proposal-template`

### 2. Curation (Ranked Lists)
"Best of" content answering comparison searches.
- Best [tools] for [use case]
- Top [products] in [category]

**Example:** `/best-crm-software-2026`

### 3. Conversions
Unit/format conversion tools.
- Currency converters
- Time zone tools
- File format converters

**Example:** `/tools/json-to-csv`

### 4. Comparisons
Head-to-head product analysis.
- [Product A] vs [Product B]
- [Tool] alternatives

**Example:** `/compare/notion-vs-airtable`

### 5. Examples
Real-world inspiration galleries.
- Landing page examples
- Email examples
- UI examples

**Example:** `/examples/saas-pricing-pages`

### 6. Locations
Geographic service-specific pages.
- [Service] in [City]
- [Product] for [Region]

**Example:** `/ai-consultants/san-francisco`

### 7. Personas
Audience-tailored landing pages.
- [Product] for [Role]
- [Tool] for [Industry]

**Example:** `/for/product-managers`

### 8. Integrations
Multi-product connection pages.
- [Your Product] + [Integration]
- Connect [A] with [B]

**Example:** `/integrations/slack`

### 9. Glossary
Term definitions building topical authority.
- What is [term]
- [Concept] definition

**Example:** `/glossary/retrieval-augmented-generation`

### 10. Translations
Multi-language content expansion.
- Localized versions of existing content
- Language-specific landing pages

**Example:** `/de/ai-agents-platform`

### 11. Directory
Comprehensive category listings.
- [Category] companies
- [Industry] tools

**Example:** `/directory/ai-agent-platforms`

### 12. Profiles
Entity and person information pages.
- [Person] profile
- [Company] overview

**Example:** `/people/sam-altman`

## Implementation Requirements

### URL Architecture

**Use subfolders (not subdomains)** to preserve domain authority:

```
✅ example.com/glossary/term-name
✅ example.com/vs/competitor-name
✅ example.com/integrations/tool-name

❌ glossary.example.com/term-name
❌ vs.example.com/competitor-name
```

### Data Hierarchy

Priority order for data sources:
1. **Proprietary data** - Your unique insights/research
2. **Curated data** - Hand-picked from multiple sources
3. **Aggregated data** - Compiled from APIs/databases
4. **Public data** - Wikipedia, open datasets (lowest value)

### Quality Controls

Pre-launch checklist for each page:
- [ ] Unique value beyond template
- [ ] Answers specific search intent
- [ ] Substantive content (not thin)
- [ ] Internal links to/from hub pages
- [ ] Proper schema markup
- [ ] Unique meta title/description
- [ ] No duplicate content issues

### Strategic Linking

Use **hub-and-spoke model**:

```
                    [Hub: AI Glossary]
                          |
    +--------+--------+--------+--------+
    |        |        |        |        |
[Term 1] [Term 2] [Term 3] [Term 4] [Term 5]
```

- Hub pages link to all spokes
- Spoke pages link back to hub
- Related spokes link to each other

## Content Templates

### Glossary Term Template

```markdown
# What is [Term]?

[2-3 sentence definition for snippet/quick answer]

## Overview

[Expanded explanation, 150-300 words]

## How [Term] Works

[Technical explanation or process]

## [Term] Examples

[Real-world examples]

## [Term] vs [Related Term]

[Comparison to clarify differences]

## Why [Term] Matters

[Business/practical relevance]

## Related Terms

- [Related Term 1]
- [Related Term 2]
- [Related Term 3]
```

### Comparison Page Template

```markdown
# [Product A] vs [Product B]: [Year] Comparison

**TL;DR:** [2-sentence summary of key differences]

## Quick Comparison

| Feature | [Product A] | [Product B] |
|---------|-------------|-------------|
| Best for | [Use case] | [Use case] |
| Price | $X/mo | $X/mo |
| Context | [Key feature] | [Key feature] |

## Detailed Comparison

### Features
[In-depth feature comparison]

### Pricing
[Detailed pricing breakdown]

### Best For
[Product A] is best for teams who [need X].
[Product B] is best for teams who [need Y].

## Our Take

[Your product as an alternative if applicable]
```

## Critical Warnings

### What to Avoid

- **Doorway pages** - Many similar pages targeting same keyword
- **Keyword stuffing** - Unnatural keyword density
- **Duplicate content** - Same content with minor variations
- **Thin content** - Pages with no unique value
- **Over-generation** - Quantity over quality

### Quality Rule

> "Better to have 100 great pages than 10,000 thin ones"

Google's helpful content update specifically targets programmatic content that doesn't provide unique value.

## Measuring Success

Track these metrics per page type:
- Impressions and clicks (Search Console)
- Average position over time
- Pages indexed vs. submitted
- Organic traffic per template type
- Conversion rate by page type

## Implementation Examples

Potential programmatic SEO opportunities:
- `/glossary/[ai-term]` - AI concepts glossary
- `/compare/[agent-a]-vs-[agent-b]` - Agent comparisons
- `/integrations/[tool]` - Integration pages
- `/for/[role]` - Role-specific landing pages
