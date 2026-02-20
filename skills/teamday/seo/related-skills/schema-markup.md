# Schema Markup & Structured Data

> Source: marketingskills/schema-markup
> Use for: Adding structured data to pages for rich search results

## When to Use

- Adding FAQ schema to articles
- Implementing Article/BlogPosting schema
- Adding Organization schema
- Setting up Product schema for SaaS
- Creating HowTo schema for tutorials
- Adding BreadcrumbList for navigation

## Core Principles

1. **Schema must accurately represent page content** - Never add schema for content that doesn't exist
2. **JSON-LD is Google's recommended format** - Use `<script type="application/ld+json">`
3. **Only implement supported schemas** - Check Google's Rich Results documentation
4. **Validate all implementations** - Use Google Rich Results Test

## Common Schema Types

### FAQPage (High CTR Impact)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is [topic]?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Answer text here..."
      }
    }
  ]
}
```

**Use on:** Blog posts, help pages, product pages with common questions

### Article/BlogPosting

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "@id": "https://example.com/blog/post#article",
  "headline": "Article Title",
  "description": "Meta description",
  "image": "https://example.com/image.jpg",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Company Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2026-01-15",
  "dateModified": "2026-01-20",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/blog/post"
  }
}
```

### Organization (Homepage)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "sameAs": [
    "https://twitter.com/company",
    "https://linkedin.com/company/name"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "email": "support@example.com"
  }
}
```

### WebSite with SearchAction

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Site Name",
  "url": "https://example.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://example.com/search?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
}
```

### SoftwareApplication (SaaS)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Product Name",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/OnlineOnly"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "150"
  }
}
```

### HowTo (Tutorials)

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to [Do Thing]",
  "description": "Learn how to...",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Step 1 Title",
      "text": "Step 1 description"
    },
    {
      "@type": "HowToStep",
      "name": "Step 2 Title",
      "text": "Step 2 description"
    }
  ]
}
```

### BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://example.com"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Blog",
      "item": "https://example.com/blog"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Article Title"
    }
  ]
}
```

## Multiple Schemas on One Page

Use `@graph` to combine multiple schemas:

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebPage",
      "@id": "https://example.com/page#webpage",
      "url": "https://example.com/page",
      "name": "Page Title"
    },
    {
      "@type": "Article",
      "@id": "https://example.com/page#article",
      "isPartOf": { "@id": "https://example.com/page#webpage" },
      "headline": "Article Headline"
    },
    {
      "@type": "FAQPage",
      "mainEntity": [...]
    }
  ]
}
```

## Nuxt/Vue Implementation

Create a reusable component:

```vue
<script setup lang="ts">
const props = defineProps<{
  schema: object;
}>();

useHead(() => ({
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify(props.schema),
    },
  ],
}));
</script>

<template>
  <!-- No visible output -->
</template>
```

## Validation Tools

1. **Google Rich Results Test**: https://search.google.com/test/rich-results
2. **Schema.org Validator**: https://validator.schema.org/
3. **Search Console Enhancements**: Check for errors after deployment

## Common Errors to Avoid

- Missing required properties (check schema.org specs)
- Invalid date formats (use ISO 8601: `2026-01-15`)
- Relative URLs instead of absolute
- Schema that doesn't match visible content
- Duplicate schemas of same type
- PII in schema (emails without user consent)

## Impact on CTR

| Schema Type | Typical CTR Improvement |
|-------------|------------------------|
| FAQPage | +20-50% |
| HowTo | +15-30% |
| Product with ratings | +25-40% |
| Article with author | +10-20% |
| Breadcrumbs | +5-15% |
