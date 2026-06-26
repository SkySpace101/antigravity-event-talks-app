import os
import requests
import time
from flask import Flask, jsonify, render_template
from bs4 import BeautifulSoup
import xml.etree.ElementTree as ET

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# Simple Cache: stores (timestamp, parsed_data)
cache = {
    "timestamp": 0,
    "data": None
}
CACHE_TTL = 600  # 10 minutes cache

def parse_release_notes(xml_content):
    """
    Parses the BigQuery Release Notes XML (Atom feed).
    """
    try:
        # Atom feed typically uses namespace
        namespaces = {
            'atom': 'http://www.w3.org/2005/Atom'
        }
        
        # We can parse with BeautifulSoup for ease and tolerance
        soup = BeautifulSoup(xml_content, 'xml')
        
        # Find all entries (could be <entry> for Atom or <item> for RSS)
        entries = soup.find_all('entry') or soup.find_all('item')
        
        parsed_entries = []
        for entry in entries:
            # Title
            title_node = entry.find('title')
            title = title_node.text.strip() if title_node else "No Title"
            
            # ID / Link
            id_node = entry.find('id') or entry.find('guid') or entry.find('link')
            entry_id = id_node.text.strip() if id_node else ""
            if entry_id == "" and entry.find('link'):
                entry_id = entry.find('link').get('href', '')
            
            # Published / Updated date
            date_node = entry.find('updated') or entry.find('published') or entry.find('pubDate')
            date_str = date_node.text.strip() if date_node else ""
            
            # Content / Summary
            content_node = entry.find('content') or entry.find('summary') or entry.find('description')
            content_html = content_node.text.strip() if content_node else ""
            
            # Parse the content HTML to extract structured sections (optional, but good for rendering)
            # BigQuery release notes often group by note types: 'feature', 'changed', 'deprecated', 'known issue', etc.
            # Let's clean up content or leave it as HTML
            
            parsed_entries.append({
                "title": title,
                "id": entry_id,
                "date": date_str,
                "content": content_html
            })
            
        return parsed_entries
    except Exception as e:
        print(f"Error parsing XML: {e}")
        return []

def get_release_notes():
    """
    Fetches release notes with caching.
    """
    now = time.time()
    if cache["data"] is not None and (now - cache["timestamp"]) < CACHE_TTL:
        print("Returning cached release notes.")
        return cache["data"]
    
    print(f"Fetching fresh release notes from {FEED_URL}...")
    try:
        # User-agent header to look like a browser if needed
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        response = requests.get(FEED_URL, headers=headers, timeout=15)
        response.raise_for_status()
        
        parsed_data = parse_release_notes(response.content)
        if parsed_data:
            cache["data"] = parsed_data
            cache["timestamp"] = now
            return parsed_data
        elif cache["data"] is not None:
            # Fallback to expired cache if fetch/parse failed
            return cache["data"]
        else:
            return []
    except Exception as e:
        print(f"Error fetching release notes: {e}")
        if cache["data"] is not None:
            return cache["data"]
        return []

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def api_releases():
    data = get_release_notes()
    return jsonify({
        "success": True,
        "count": len(data),
        "releases": data
    })

if __name__ == '__main__':
    # Running on port 5000 by default
    app.run(host='127.0.0.1', port=5000, debug=True)
