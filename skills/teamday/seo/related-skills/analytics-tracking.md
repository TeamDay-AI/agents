# Analytics Tracking for SEO

> Source: marketingskills/analytics-tracking
> Use for: Setting up tracking to measure SEO performance

## When to Use

- Setting up conversion tracking
- Implementing GA4 events
- Creating UTM strategy
- Debugging tracking issues
- Planning measurement framework

## Core Principles

1. **Track for decisions, not data** - Every event should inform an action
2. **Start with questions** - What do you need to know?
3. **Name things consistently** - Conventions matter at scale
4. **Quality over quantity** - Better few accurate events than many broken

## Essential SEO Events to Track

### Marketing Site

**Navigation & Engagement:**
```javascript
// Page view (enhanced with SEO data)
gtag('event', 'page_view', {
  page_title: document.title,
  page_location: window.location.href,
  content_group: 'blog', // or 'landing', 'docs', etc.
  author: 'Author Name', // for blog posts
  publish_date: '2026-01-15'
});

// Scroll depth
gtag('event', 'scroll', {
  percent_scrolled: 50 // 25, 50, 75, 100
});

// CTA clicks
gtag('event', 'cta_clicked', {
  button_text: 'Start Free Trial',
  location: 'hero', // header, sidebar, footer, inline
  page_type: 'blog'
});
```

**Conversions:**
```javascript
// Signup started
gtag('event', 'signup_started', {
  source: 'blog_cta',
  page_url: window.location.href
});

// Signup completed
gtag('event', 'signup_completed', {
  method: 'email', // google, github
  source: 'organic'
});

// Lead form submitted
gtag('event', 'lead_submitted', {
  form_type: 'demo_request',
  page_url: window.location.href
});
```

## Event Naming Conventions

### Recommended Format: Object_Action

```
signup_started
signup_completed
cta_clicked
form_submitted
resource_downloaded
video_played
```

### Best Practices

- Lowercase with underscores
- Be specific: `cta_hero_clicked` vs `button_clicked`
- Include context in properties, not event name
- Document all events

## GA4 Configuration for SEO

### Enhanced Measurement (Enable These)

- Page views (automatic)
- Scrolls (90% depth)
- Outbound clicks
- Site search
- File downloads

### Custom Dimensions for SEO

| Dimension | Scope | Purpose |
|-----------|-------|---------|
| content_type | Event | Blog, landing, docs |
| author | Event | Blog post author |
| publish_date | Event | Content freshness |
| word_count | Event | Content depth |
| content_category | Event | Topic grouping |

### Setting Up Conversions

1. Collect event in GA4
2. Mark as conversion: Admin → Events → Mark as conversion
3. Set counting: Once per session or every time
4. Import to Google Ads if running ads

## UTM Parameter Strategy

### Standard Parameters

| Parameter | Purpose | Example |
|-----------|---------|---------|
| utm_source | Where from | google, newsletter, twitter |
| utm_medium | Channel type | organic, cpc, email, social |
| utm_campaign | Campaign name | january_newsletter |
| utm_content | Differentiate links | hero_cta, sidebar |
| utm_term | Keywords (paid) | ai+agents |

### UTM Conventions

**Always lowercase:**
```
✅ utm_source=google
❌ utm_source=Google
```

**Use underscores or hyphens consistently:**
```
✅ utm_campaign=product_launch
✅ utm_campaign=product-launch
❌ utm_campaign=product launch (no spaces)
```

### UTM Examples for SEO

**Newsletter promoting blog post:**
```
?utm_source=newsletter&utm_medium=email&utm_campaign=weekly_digest&utm_content=ai_models_article
```

**Social share of blog:**
```
?utm_source=twitter&utm_medium=social&utm_campaign=blog_promotion&utm_content=openrouter_guide
```

## Measuring SEO Success

### Key Metrics to Track

| Metric | Source | What It Tells You |
|--------|--------|-------------------|
| Organic sessions | GA4 | Overall SEO traffic |
| Organic conversions | GA4 | SEO business impact |
| Clicks | Search Console | Actual clicks from Google |
| Impressions | Search Console | Search visibility |
| Average position | Search Console | Ranking performance |
| CTR | Search Console | Listing effectiveness |

### GA4 + Search Console Integration

Connect Search Console to GA4:
1. GA4 Admin → Product Links → Search Console
2. Link to your verified property
3. Access Search Console data in GA4 reports

### Custom SEO Dashboard

Build a dashboard showing:
1. **Acquisition**: Organic traffic trend
2. **Engagement**: Pages/session, time on site
3. **Conversions**: Goal completions from organic
4. **Top pages**: By sessions and conversions
5. **Search queries**: From Search Console

## Debugging & Validation

### Testing Tools

1. **GA4 DebugView**: Real-time event monitoring
   - Add `?debug_mode=true` to URL
   - Or use GA Debugger Chrome extension

2. **GTM Preview Mode**: Test before publish
   - See trigger/tag firing
   - Validate data layer

3. **Network tab**: Check requests to Google

### Validation Checklist

- [ ] Events firing on correct triggers
- [ ] Parameters populating correctly
- [ ] No duplicate events
- [ ] Works on mobile
- [ ] Conversions recording properly
- [ ] No PII being sent

## Common Issues

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| Events not firing | Trigger misconfigured | Check GTM trigger |
| Wrong values | Variable issue | Debug data layer |
| Duplicates | Multiple GTM containers | Remove duplicate |
| Missing data | Consent blocking | Check consent mode |

## Nuxt/GA4 Implementation

```typescript
// nuxt.config.ts
gtag: {
  id: 'G-XXXXXXXX',
  config: {
    send_page_view: true,
  },
}

// In component
const { gtag } = useGtag()

// Track event
gtag('event', 'cta_clicked', {
  button_text: 'Start Free',
  location: 'hero'
})
```
