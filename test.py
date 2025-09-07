from notion_client import Client
from pprint import pprint
import os
from dotenv import load_dotenv
load_dotenv() 

notion_token = os.getenv('NOTION_TOKEN')
notion_page_id = os.getenv('PAGE_ID')

def main():
    client = Client(auth=notion_token)

    page_response = client.pages.retrieve(notion_page_id)

    pprint(page_response, indent=2)

if __name__ == '__main__':
    main()