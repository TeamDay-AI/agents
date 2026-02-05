# Blog Writer Suite Plugin

Complete blog writing toolkit with AI image generation and screenshot capabilities.

## Features

- **AI Image Generation** - Create cover images with FAL AI (FLUX models)
- **Screenshot Capture** - Capture UI screenshots for product content
- **Multiple Writing Styles** - Claude Perspective, Business Narrative, Case Study
- **SEO Optimization** - Metadata, titles, descriptions

## Skills Included

- `generate-image` - Generate AI images using FAL AI
- `screenshot` - Capture web page screenshots

## Agents Included

- `blog-writer` - Expert blog writer with multiple styles

## Requirements

| Credential | Description |
|------------|-------------|
| `FAL_KEY` | FAL AI API key for image generation |

## Usage

### Generate Cover Image
```
/generate-image "abstract visualization of AI agents collaborating" cover.webp
```

### Capture Screenshot
```
/screenshot http://localhost:3000/ai newsfeed-screenshot.webp --dark
```

### Write Blog Post
Chat with the blog-writer agent to create content in your preferred style.

## Installation

```bash
/plugin install blog-writer
```
