#!/usr/bin/env python3
"""
Generate Anki APKG file from flashcards data
"""

import json
import sys
import os
from genanki import Deck, Model, Note, Package

# Define the card model (similar to Anki's Basic card)
my_model = Model(
    1607392319,  # Model ID - should be unique
    'Notion Flashcards',
    fields=[
        {'name': 'Question'},
        {'name': 'Answer'},
    ],
    templates=[
        {
            'name': 'Card 1',
            'qfmt': '{{Question}}',
            'afmt': '{{FrontSide}}<hr id="answer">{{Answer}}',
        },
    ],
    css='''
    .card {
        font-family: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
        font-size: 20px;
        text-align: center;
        color: #37352f;
        background-color: #ffffff;
    }
    .question {
        font-weight: 600;
        margin-bottom: 20px;
    }
    .answer {
        color: #6f6e69;
        font-weight: 400;
    }
    hr#answer {
        border: none;
        border-top: 1px solid #e9e9e7;
        margin: 20px 0;
    }
    '''
)

def create_apkg(flashcards_data, output_path):
    """Create an APKG file from flashcards data"""
    
    # Create a new deck
    deck = Deck(
        2059400110,  # Deck ID - should be unique
        'Notion Flashcards'
    )
    
    # Add each flashcard as a note
    for card in flashcards_data:
        note = Note(
            model=my_model,
            fields=[card['question'], card['answer']]
        )
        deck.add_note(note)
    
    # Create the package and write to file
    package = Package(deck)
    package.write_to_file(output_path)
    
    return True

def main():
    """Main function to handle command line arguments"""
    if len(sys.argv) != 3:
        print("Usage: python generate_apkg.py <flashcards_json> <output_apkg_path>")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        # Read flashcards data from JSON file
        with open(input_file, 'r', encoding='utf-8') as f:
            flashcards = json.load(f)
        
        # Create APKG file
        success = create_apkg(flashcards, output_file)
        
        if success:
            print(f"Successfully created APKG file: {output_file}")
        else:
            print("Failed to create APKG file")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
