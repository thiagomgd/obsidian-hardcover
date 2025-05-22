# 🚧 Work in Progress - Obsidian Hardcover Plugin 🚧

# Obsidian Hardcover Plugin

Syncs your [Hardcover](https://hardcover.app) library to your Obsidian vault, creating one note per book with metadata stored in frontmatter properties.

## Features

- **Complete Library Sync**: Import your entire Hardcover library as Obsidian notes
- **Incremental Updates**: Only sync books that have changed since your last sync
- **Rich Metadata**: Store book information as frontmatter properties:
  - Basic info: Title, authors, publisher, release date
  - Reading data: Status, rating, read dates
  - Content: Description, genres, series information
- **Customizable Format**:
  - Choose which data to include in your notes
  - Configure property names to match your personal system
  - Select data source preferences (book vs. edition level)
- **User notes**: The plugin uses a delimiter system to separate plugin-generated content and user-added content. This means you can add your own notes (thoughts, quotes...) to a book note below the delimiter and it will be preserved during syncs.

> [!WARNING]
> While the delimiter system protects your content during syncs, regular backups of your vault are still recommended. I am not responsible for any data loss.

## Installation

## Setup

1. Get your Hardcover API key from [Hardcover](https://hardcover.app/account/api)
2. Open Obsidian Settings and go to the "Hardcover" tab
3. Enter your API key in the settings
4. Configure a target folder for your book notes (must be a subfolder, not vault root)
5. Customize which fields to include and their property names
6. Click "Sync now" to import your library

> [!TIP]
> If you want to test your setup before syncing everything, you can use the Debug menu to run a test sync with a limited number of books. Recommended for large libraries.
