# APKG Generation for Anki AI Extension

This extension now supports generating Anki package files (APKG) from the generated flashcards.

## How it works

1. **Generate Flashcards**: Click "Generate Flashcards" to create flashcards from your Notion page
2. **Export to Anki**: Once flashcards are loaded, click "Export to Anki" to download an APKG file
3. **Import to Anki**: Open the downloaded APKG file in Anki to import your flashcards

## Current Implementation

The current implementation creates a JSON file with the flashcard data. To create a proper APKG file:

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the Python script to convert JSON to APKG:
   ```bash
   python generate_apkg.py flashcards.json output.apkg
   ```

## File Structure

- `generate_apkg.py` - Python script to create APKG files using genanki
- `requirements.txt` - Python dependencies
- `test_apkg.html` - Test page for APKG generation

## Future Improvements

- Direct APKG generation in the browser (requires WebAssembly or server-side processing)
- Integration with Anki Connect API
- Custom card templates and styling
