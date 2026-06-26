# BigQuery Release Notes Explorer

A premium, modern web application built with **Python Flask** and **Vanilla HTML, JavaScript, and CSS** to browse, search, and filter BigQuery Release Notes.

## Features

- **Interactive Parser**: Automatically parses the raw feed's HTML content and groups release items into styled sections (`Feature`, `Change`, `Deprecation`, `Fix`).
- **One-Click X (Twitter) Sharing**: Instantly share any specific update with a styled Tweet button. It formats the update type, date, text snippet (fitting standard character limits with smart truncation), and tags (#GCP #BigQuery).
- **Interactive Search**: Full-text fuzzy search across dates, release titles, and update descriptions with real-time text highlighting.
- **Deep Categorization & Filtering**: Filter updates by category (e.g. *Features only*, *Changes only*) across all entries or search matches.
- **Dual Themes**: Sleek, glassmorphic Dark Mode (default) and clean, crisp Light Mode with custom scrollbars, animations, and transitions.
- **Smart Server Caching**: Flask-based server-side caching (10-minute TTL) ensures rapid load times and respects Google Cloud feed rate limits.
- **Responsive Layout**: Designed for seamless use on desktops, tablets, and mobile devices.

## Project Structure

- `app.py`: Flask backend, feed fetcher, Atom XML parser, and in-memory cache.
- `requirements.txt`: Python package dependencies (`Flask`, `requests`, `beautifulsoup4`, `lxml`).
- `templates/index.html`: Main HTML layout structure.
- `static/css/style.css`: Design system with custom dark/light color palettes, glassmorphism, animations, and typography.
- `static/js/app.js`: Frontend logic for fetching data, parsing headings, filtering, searching, and managing the UI.
- `run.bat`: Quick-start launcher for Windows systems.

## Quick Start

### 1. Prerequisites
Ensure you have Python installed. The launcher defaults to Python Launcher (`py -3.11`).

### 2. Run the Application
Double-click `run.bat` or run:
```bash
# Start the Flask app
py -3.11 app.py
```
Then navigate to `http://127.0.0.1:5000` in your web browser.
