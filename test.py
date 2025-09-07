import requests
import os
from dotenv import load_dotenv
from datetime import datetime, timezone

load_dotenv()
NOTION_TOKEN = os.environ["NOTION_TOKEN"]
DATABASE_ID = os.environ["DATABASE_ID"]

headers = {
    "Authorization": "Bearer " + NOTION_TOKEN,
    "Content-Type": "application/json",
    "Notion-Version": "2022-06-28",
}

def get_pages():
    """
    If num_pages is None, get all pages, otherwise just the defined number.
    """
    url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"

    payload = {"page_size": 100}
    response = requests.post(url, json=payload, headers=headers)

    data = response.json()

    # Comment this out to dump all data to a file
    import json
    with open('db.json', 'w', encoding='utf8') as f:
       json.dump(data, f, ensure_ascii=False, indent=4)

    results = data["results"]
    # while data["has_more"] and get_all:
    #     payload = {"page_size": page_size, "start_cursor": data["next_cursor"]}
    #     url = f"https://api.notion.com/v1/databases/{DATABASE_ID}/query"
    #     response = requests.post(url, json=payload, headers=headers)
    #     data = response.json()
    #     results.extend(data["results"])

    return results

pages = get_pages()

for page in pages:
    page_id = page["id"]
    props = page["properties"]
    url = props["URL"]["title"][0]["text"]["content"]
    title = props["Title"]["rich_text"][0]["text"]["content"]
    published = props["Published"]["date"]["start"]
    published = datetime.fromisoformat(published)
    print(url, title, published)