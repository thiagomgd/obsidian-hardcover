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

## Sync Process

The plugin follows these steps when syncing:

1. Fetches books from the Hardcover API (in batches of 100)
2. Creates or updates notes for each book
3. Stores the sync timestamp for incremental updates

For large libraries, the plugin uses pagination and respects API rate limits.

- If some books fail to process, others will still be synced
- The timestamp is only updated if all books process successfully

## Configuration Options

### Fields

Configure which fields to include in your book notes:

- **Title**: Book or edition title
- **Description**: Book synopsis/summary
- **Cover**: Book or edition cover image
- **Release Date**: Book or edition publication date
- **Series**: Series name and position (e.g. "The Murderbot Diaries #1")
- **Authors**: The main writer/s of the book
- **Contributors**: Other contributors (translators, narrators, etc.)
- **Publisher**: Publishing house name
- **URL**: Link to the book on Hardcover
- **Genres**: Book genre tags
- **Status**: Reading status (Want to Read, Currently Reading, etc.) - you can customize the text
- **Rating**: Your 1-5 star rating
- **Review**: Your written review
- **First Read**: Start and end dates of your first read
- **Last Read**: Start and end dates of your most recent read
- **Total Reads**: Number of times you've read the book
- **Read Years**: List of years when you read the book
