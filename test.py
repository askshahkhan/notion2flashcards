from notion_client import Client
from pprint import pprint
import os
from dotenv import load_dotenv
load_dotenv() 

notion_token = os.getenv('NOTION_TOKEN')
notion_page_id = os.getenv('PAGE_ID')

def write_text(client, page_id, text, type):
    client.blocks.children.append(
        block_id=page_id,
        children=[
            {
                "object": "block",
                "type": type,
                type: {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": text
                            }
                        }
                    ]
                }
            }
        ]
    )

def main():
    client = Client(auth=notion_token)

    while True:
        write_text(client, notion_page_id, 'Hello World!', 'to_do')

if __name__ == '__main__':
    main()