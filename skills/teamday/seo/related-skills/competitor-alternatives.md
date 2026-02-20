# Competitor & Alternative Pages

> Source: marketingskills/competitor-alternatives
> Use for: Creating pages that rank for competitor search terms

## When to Use

- Building "[Competitor] alternative" pages
- Creating "vs" comparison pages
- Capturing competitor brand search traffic
- Sales enablement content

## Core Principles

1. **Honesty builds trust** - Acknowledge competitor strengths
2. **Depth over surface** - Go beyond feature checklists
3. **Help them decide** - Be clear about who each is best for
4. **Centralize data** - Single source of truth per competitor

## Four Page Formats

### Format 1: [Competitor] Alternative (Singular)

**Intent:** User actively looking to switch

**URL:** `/alternatives/[competitor]`

**Keywords:**
- "[Competitor] alternative"
- "alternative to [Competitor]"
- "switch from [Competitor]"

**Structure:**
1. Why people look for alternatives (validate pain)
2. Your product as the solution
3. Detailed comparison
4. Who should switch (and who shouldn't)
5. Migration path
6. Social proof from switchers
7. CTA

---

### Format 2: [Competitor] Alternatives (Plural)

**Intent:** User researching options, earlier in journey

**URL:** `/alternatives/[competitor]-alternatives`

**Keywords:**
- "[Competitor] alternatives"
- "best [Competitor] alternatives"
- "tools like [Competitor]"

**Structure:**
1. Why people seek alternatives
2. What to look for (criteria framework)
3. List of alternatives (you + 4-7 real options)
4. Comparison table
5. Recommendation by use case
6. CTA

**Important:** Include real alternatives. Being helpful builds trust.

---

### Format 3: You vs [Competitor]

**Intent:** Direct comparison between you and competitor

**URL:** `/vs/[competitor]`

**Keywords:**
- "[You] vs [Competitor]"
- "[Competitor] vs [You]"

**Structure:**
1. TL;DR (2-3 sentence summary)
2. At-a-glance comparison table
3. Detailed comparison by category
4. Who you're best for
5. Who competitor is best for (be honest)
6. Testimonials from switchers
7. CTA

---

### Format 4: [A] vs [B] (Third-party)

**Intent:** User comparing two competitors (not you)

**URL:** `/compare/[a]-vs-[b]`

**Keywords:**
- "[A] vs [B]"
- "[A] or [B]"

**Structure:**
1. Overview of both products
2. Comparison by category
3. Who each is best for
4. The third option (introduce yourself)
5. Comparison table (all three)
6. CTA

**Why:** Capture competitor search traffic, position as knowledgeable.

---

## Index Pages

Each format needs a hub page:

**Alternatives Index:** `/alternatives`
```markdown
## [Your Product] as an Alternative

- **[Notion Alternative](/alternatives/notion)** — Better for [X]
- **[Airtable Alternative](/alternatives/airtable)** — Better for [Y]
```

**Vs Comparisons Index:** `/vs`
```markdown
## Compare [Your Product]

### Direct Comparisons
- [[Your Product] vs Notion](/vs/notion)
- [[Your Product] vs Airtable](/vs/airtable)

### Other Comparisons
- [Notion vs Airtable](/compare/notion-vs-airtable)
```

## Content Architecture

### Centralized Competitor Data

Create per-competitor files:

```yaml
# competitor_data/notion.yaml
name: Notion
website: notion.so
tagline: "The all-in-one workspace"

pricing:
  model: per-seat
  free_tier: true
  starter: $8/user/month
  business: $15/user/month

features:
  documents: 5/5
  databases: 4/5
  project_management: 3/5

strengths:
  - Extremely flexible
  - Beautiful interface
  - Strong template ecosystem

weaknesses:
  - Slow with large databases
  - Learning curve
  - Limited offline

best_for:
  - All-in-one workspace needs
  - Documentation-first teams
  - Startups and small teams

not_ideal_for:
  - Complex project management
  - Large databases
  - Strict offline requirements
```

### Your Product Data

Same format for yourself:

```yaml
name: YourProduct
# ... same fields

strengths:
  - [Real strengths]

weaknesses:
  - [Honest limitations]
```

## Section Templates

### TL;DR Summary

```markdown
**TL;DR**: [Competitor] excels at [strength] but struggles with [weakness].
[Your product] is built for [focus], offering [differentiator].
Choose [Competitor] if [use case]. Choose [You] if [use case].
```

### Feature Comparison (Not Just Tables)

```markdown
## [Category]

**[Competitor]**: [Description of approach]
- Strengths: [specific]
- Limitations: [specific]

**[Your product]**: [Description]
- Strengths: [specific]
- Limitations: [specific]

**Bottom line**: Choose [Competitor] if [scenario]. Choose [You] if [scenario].
```

### Who It's For

```markdown
## Who Should Choose [Competitor]

[Competitor] is right if:
- [Specific use case]
- [Team type]
- [Requirement]

**Ideal customer**: [1-2 sentence persona]

## Who Should Choose [Your Product]

[Your product] is built for:
- [Use case]
- [Team type]
- [Priority]

**Ideal customer**: [1-2 sentence persona]
```

### Migration Section

```markdown
## Switching from [Competitor]

### What transfers
- [Data type]: [Effort level]

### What needs reconfiguration
- [Item]: [Why]

### Migration support
- [What you offer]
- [Timeline]
```

## SEO Considerations

### Schema Markup

Add FAQ schema:

```json
{
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is the best alternative to [Competitor]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "[Your positioning]"
      }
    }
  ]
}
```

### Internal Linking

- Link between related competitor pages
- Link from feature pages to comparisons
- Link from blog mentions of competitors
- Hub pages link to all comparisons

## Research Process

### Per Competitor

1. **Product research**: Sign up, use it, document
2. **Pricing research**: Current pricing, hidden costs
3. **Review mining**: G2, Capterra themes
4. **Customer feedback**: Talk to switchers
5. **Content research**: Their positioning, comparisons

### Maintenance

- **Quarterly**: Verify pricing, major changes
- **Annually**: Full refresh of all data

## Your Opportunities

Potential competitor pages:
- `/alternatives/n8n` - Workflow automation
- `/vs/zapier` - Integration comparison
- `/compare/make-vs-n8n` - Third-party comparison
- `/alternatives/langchain` - AI framework comparison
