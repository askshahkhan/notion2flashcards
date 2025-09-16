from notion_client import Client
import os
from dotenv import load_dotenv
from openai import OpenAI
import json
import genanki  # NEW: For creating Anki .apkg files

# --- Load environment variables ---
load_dotenv()
notion_token = os.getenv("NOTION_TOKEN")
notion_page_id = os.getenv("PAGE_ID")
openai_api_key = os.getenv("OPENAI_API_KEY")

# --- Initialize clients ---
notion_client = Client(auth=notion_token)
openai_client = OpenAI(api_key=openai_api_key)

# --- Notion text extraction ---
def extract_text_from_block(block):
    block_type = block.get("type")
    block_obj = block.get(block_type, {})

    text_segments = []
    if "rich_text" in block_obj:
        for rt in block_obj["rich_text"]:
            text_segments.append(rt.get("plain_text", ""))
    elif "title" in block_obj:
        text_segments.append(block_obj["title"])
    return "".join(text_segments).strip()

def get_page_text(client, page_id):
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
            next_cursor = blocks.get("next_cursor")
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

# --- OpenAI flashcard generation ---
def generate_flashcards(text):
    """
    Generate Q&A flashcards using GPT-4 and new OpenAI SDK.
    Returns a list of {"question": "...", "answer": "..."} dicts.
    """
    prompt = f"""
You are an expert at creating study flashcards.
Given the following text, generate concise flashcards.
Output only a JSON list in this format: 
[{{"question": "...", "answer": "..."}}]

Text:
{text}
"""
    response = openai_client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are an expert at creating study flashcards."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3,
        max_tokens=1500
    )

    content = response.choices[0].message.content

    try:
        flashcards = json.loads(content)
    except json.JSONDecodeError:
        print("Warning: Could not parse JSON. Raw content:")
        print(content)
        flashcards = []

    return flashcards

# --- Convert to Anki .apkg format ---
def export_to_anki_apkg(flashcards, filename="anki_flashcards.apkg"):
    """
    Exports flashcards as a real Anki .apkg file using genanki.
    """
    model = genanki.Model(
        1607392319,
        'Simple Flashcard Model',
        fields=[{'name': 'Question'}, {'name': 'Answer'}],
        templates=[{
            'name': 'Card 1',
            'qfmt': '{{Question}}',
            'afmt': '{{FrontSide}}<hr id="answer">{{Answer}}'
        }]
    )

    deck = genanki.Deck(2059400110, 'Generated Flashcards')

    for fc in flashcards:
        if "question" in fc and "answer" in fc:
            note = genanki.Note(
                model=model,
                fields=[fc["question"], fc["answer"]]
            )
            deck.add_note(note)

    genanki.Package(deck).write_to_file(filename)
    print(f"Exported {len(flashcards)} flashcards to {filename}")

# --- Main ---
def main():
    print("Fetching all text from Notion page...")
    page_text = get_page_text(notion_client, notion_page_id)
    print(f"Extracted {len(page_text)} characters of text.\n")

    print("Generating flashcards via OpenAI GPT-4...\n")
    flashcards = generate_flashcards(page_text)

    if flashcards:
        print(f"Generated {len(flashcards)} flashcards. Exporting to Anki .apkg...\n")
        export_to_anki_apkg(flashcards)
    else:
        print("No flashcards generated.")

if __name__ == "__main__":
    main()