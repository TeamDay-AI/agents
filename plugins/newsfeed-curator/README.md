# AI Newsfeed Curator Plugin

Curate and manage AI newsfeeds from YouTube, blogs, and social media.

## Features

- **Video Import** - Add YouTube videos with automatic transcript extraction
- **Entity Extraction** - Identify companies, people, products mentioned
- **Embeddings** - Generate vector embeddings for semantic search
- **Translations** - Auto-translate content to multiple languages

## Skills Included

- `newsfeed-add-video` - Import videos to newsfeed
- `newsfeed-extract-entities` - Extract named entities from content
- `newsfeed-translate` - Translate feed items

## Requirements

| Credential | Description |
|------------|-------------|
| `YOUTUBE_API_KEY` | YouTube Data API key for video metadata |
| `OPENAI_API_KEY` | OpenAI API key for embeddings |

## Usage

```
/newsfeed https://youtube.com/watch?v=xxx
```

Adds video to AI newsfeed with:
- Transcript extraction
- Entity identification
- Embedding generation
- Optional translation

## Installation

```bash
/plugin install newsfeed-curator
```
