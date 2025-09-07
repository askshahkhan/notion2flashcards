import requests
import os
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables
load_dotenv()
NOTION_TOKEN = os.environ["NOTION_TOKEN"]
DATABASE_ID = os.environ["DATABASE_ID"]

headers = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

def get_pages():
    """
    Get up to 100 pages from the Notion database.
    """
    url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
    payload = {"page_size": 100}
    response = requests.post(url, json=payload, headers=headers)
    data = response.json()

    with open('db.json', 'w', encoding='utf8') as f:
        import json
        json.dump(data, f, ensure_ascii=False, indent=4)

    return data["results"]

def create_page(title: str, url_value: str, published_date: str):
    """
    Create a new page in the Notion database.
    title: string for the Title property
    url_value: string for the URL property
    published_date: ISO 8601 date string (e.g., '2025-09-07')
    """
    url = "https://api.notion.com/v1/pages"
    payload = {
        "parent": {"database_id": DATABASE_ID},
        "properties": {
            "Title": {
                "rich_text": [{"type": "text", "text": {"content": title}}]
            },
            "URL": {
                "title": [{"type": "text", "text": {"content": url_value}}]
            },
            "Published": {
                "date": {"start": published_date}
            }
        }
    }

    response = requests.post(url, json=payload, headers=headers)
    if response.status_code == 200:
        print("Page created successfully!")
        return response.json()
    else:
        print("Failed to create page:", response.status_code, response.text)
        return None

# --- Example usage ---

# 1. Fetch existing pages
pages = get_pages()
for page in pages:
    props = page["properties"]
    url_val = props["URL"]["title"][0]["text"]["content"]
    title_val = props["Title"]["rich_text"][0]["text"]["content"]
    published_val = props["Published"]["date"]["start"]
    published_val = datetime.fromisoformat(published_val)
    print(url_val, title_val, published_val)

# 2. Add a new page
new_page = create_page(
    title="My New Article",
    url_value="https://example.com/my-article",
    published_date=datetime.now().strftime("%Y-%m-%d")
)