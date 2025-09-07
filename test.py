from notion_client import Client
from pprint import pprint
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
notion_token = os.getenv("NOTION_TOKEN")
notion_page_id = os.getenv("PAGE_ID")  # hyphenated form preferred: 267ad5f6-5155-8081-a9fd-fa77fd4da2c5

def extract_text_from_block(block):
    """Extract plain text from a Notion block if it has rich_text or title."""
    block_type = block.get("type")
    block_obj = block.get(block_type, {})

    text_segments = []
    # Most text blocks have rich_text
    if "rich_text" in block_obj:
        for rt in block_obj["rich_text"]:
            text_segments.append(rt.get("plain_text", ""))
    # Some blocks like child_page have 'title'
    elif "title" in block_obj:
        text_segments.append(block_obj["title"])
    return "".join(text_segments).strip()

def get_page_text(client, page_id):
    """Recursively fetches all text content from a Notion page."""
    all_text = []

    def fetch_blocks(block_id):
        blocks = client.blocks.children.list(block_id=block_id)
        for block in blocks.get("results", []):
            text = extract_text_from_block(block)
            if text:
                all_text.append(text)
            if block.get("has_children", False):
                fetch_blocks(block["id"])
        if blocks.get("has_more"):
            # If there are more blocks, fetch them too
            next_cursor = blocks["next_cursor"]
            if next_cursor:
                more_blocks = client.blocks.children.list(block_id=block_id, start_cursor=next_cursor)
                for block in more_blocks.get("results", []):
                    text = extract_text_from_block(block)
                    if text:
                        all_text.append(text)
                    if block.get("has_children", False):
                        fetch_blocks(block["id"])

    fetch_blocks(page_id)
    return "\n".join(all_text)

def main():
    client = Client(auth=notion_token)
    text = get_page_text(client, notion_page_id)
    print("Extracted page text:\n")
    print(text if text else "(No text found)")

if __name__ == "__main__":
    main()