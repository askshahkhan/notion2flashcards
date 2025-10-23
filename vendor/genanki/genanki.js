/**
 * Anki Package Generator
 * A clean-room implementation for creating Anki flashcard packages (.apkg files)
 * 
 * @license MIT
 */

(function(global) {
  'use strict';

  // ========== SHA-256 Implementation ==========
  // Based on js-sha256 by Chen, Yi-Cyuan (MIT License)
  
  var ERROR = 'input is invalid type';
  var HEX_CHARS = '0123456789abcdef'.split('');
  var EXTRA = [-2147483648, 8388608, 32768, 128];
  var SHIFT = [24, 16, 8, 0];
  var K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  var blocks = [];

  function Sha256(is224, sharedMemory) {
    if (sharedMemory) {
      blocks[0] = blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      this.blocks = blocks;
    } else {
      this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    if (is224) {
      this.h0 = 0xc1059ed8;
      this.h1 = 0x367cd507;
      this.h2 = 0x3070dd17;
      this.h3 = 0xf70e5939;
      this.h4 = 0xffc00b31;
      this.h5 = 0x68581511;
      this.h6 = 0x64f98fa7;
      this.h7 = 0xbefa4fa4;
    } else {
      this.h0 = 0x6a09e667;
      this.h1 = 0xbb67ae85;
      this.h2 = 0x3c6ef372;
      this.h3 = 0xa54ff53a;
      this.h4 = 0x510e527f;
      this.h5 = 0x9b05688c;
      this.h6 = 0x1f83d9ab;
      this.h7 = 0x5be0cd19;
    }

    this.block = this.start = this.bytes = this.hBytes = 0;
    this.finalized = this.hashed = false;
    this.first = true;
    this.is224 = is224;
  }

  Sha256.prototype.update = function (message) {
    if (this.finalized) {
      return;
    }
    var notString, type = typeof message;
    if (type !== 'string') {
      if (type === 'object') {
        if (message === null) {
          throw new Error(ERROR);
        } else if (message.constructor === ArrayBuffer) {
          message = new Uint8Array(message);
        } else if (!Array.isArray(message)) {
          if (!ArrayBuffer.isView(message)) {
            throw new Error(ERROR);
          }
        }
      } else {
        throw new Error(ERROR);
      }
      notString = true;
    }
    var code, index = 0, i, length = message.length, blocks = this.blocks;

    while (index < length) {
      if (this.hashed) {
        this.hashed = false;
        blocks[0] = this.block;
        blocks[16] = blocks[1] = blocks[2] = blocks[3] =
          blocks[4] = blocks[5] = blocks[6] = blocks[7] =
          blocks[8] = blocks[9] = blocks[10] = blocks[11] =
          blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
      }

      if (notString) {
        for (i = this.start; index < length && i < 64; ++index) {
          blocks[i >> 2] |= message[index] << SHIFT[i++ & 3];
        }
      } else {
        for (i = this.start; index < length && i < 64; ++index) {
          code = message.charCodeAt(index);
          if (code < 0x80) {
            blocks[i >> 2] |= code << SHIFT[i++ & 3];
          } else if (code < 0x800) {
            blocks[i >> 2] |= (0xc0 | (code >> 6)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else if (code < 0xd800 || code >= 0xe000) {
            blocks[i >> 2] |= (0xe0 | (code >> 12)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          } else {
            code = 0x10000 + (((code & 0x3ff) << 10) | (message.charCodeAt(++index) & 0x3ff));
            blocks[i >> 2] |= (0xf0 | (code >> 18)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 12) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | ((code >> 6) & 0x3f)) << SHIFT[i++ & 3];
            blocks[i >> 2] |= (0x80 | (code & 0x3f)) << SHIFT[i++ & 3];
          }
        }
      }

      this.lastByteIndex = i;
      this.bytes += i - this.start;
      if (i >= 64) {
        this.block = blocks[16];
        this.start = i - 64;
        this.hash();
        this.hashed = true;
      } else {
        this.start = i;
      }
    }
    if (this.bytes > 4294967295) {
      this.hBytes += this.bytes / 4294967296 << 0;
      this.bytes = this.bytes % 4294967296;
    }
    return this;
  };

  Sha256.prototype.finalize = function () {
    if (this.finalized) {
      return;
    }
    this.finalized = true;
    var blocks = this.blocks, i = this.lastByteIndex;
    blocks[16] = this.block;
    blocks[i >> 2] |= EXTRA[i & 3];
    this.block = blocks[16];
    if (i >= 56) {
      if (!this.hashed) {
        this.hash();
      }
      blocks[0] = this.block;
      blocks[16] = blocks[1] = blocks[2] = blocks[3] =
        blocks[4] = blocks[5] = blocks[6] = blocks[7] =
        blocks[8] = blocks[9] = blocks[10] = blocks[11] =
        blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
    }
    blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
    blocks[15] = this.bytes << 3;
    this.hash();
  };

  Sha256.prototype.hash = function () {
    var a = this.h0, b = this.h1, c = this.h2, d = this.h3, e = this.h4, f = this.h5, g = this.h6,
      h = this.h7, blocks = this.blocks, j, s0, s1, maj, t1, t2, ch, ab, da, cd, bc;

    for (j = 16; j < 64; ++j) {
      t1 = blocks[j - 15];
      s0 = ((t1 >>> 7) | (t1 << 25)) ^ ((t1 >>> 18) | (t1 << 14)) ^ (t1 >>> 3);
      t1 = blocks[j - 2];
      s1 = ((t1 >>> 17) | (t1 << 15)) ^ ((t1 >>> 19) | (t1 << 13)) ^ (t1 >>> 10);
      blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1 << 0;
    }

    bc = b & c;
    for (j = 0; j < 64; j += 4) {
      if (this.first) {
        if (this.is224) {
          ab = 300032;
          t1 = blocks[0] - 1413257819;
          h = t1 - 150054599 << 0;
          d = t1 + 24177077 << 0;
        } else {
          ab = 704751109;
          t1 = blocks[0] - 210244248;
          h = t1 - 1521486534 << 0;
          d = t1 + 143694565 << 0;
        }
        this.first = false;
      } else {
        s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        ab = a & b;
        maj = ab ^ (a & c) ^ bc;
        ch = (e & f) ^ (~e & g);
        t1 = h + s1 + ch + K[j] + blocks[j];
        t2 = s0 + maj;
        h = d + t1 << 0;
        d = t1 + t2 << 0;
      }
      s0 = ((d >>> 2) | (d << 30)) ^ ((d >>> 13) | (d << 19)) ^ ((d >>> 22) | (d << 10));
      s1 = ((h >>> 6) | (h << 26)) ^ ((h >>> 11) | (h << 21)) ^ ((h >>> 25) | (h << 7));
      da = d & a;
      maj = da ^ (d & b) ^ ab;
      ch = (h & e) ^ (~h & f);
      t1 = g + s1 + ch + K[j + 1] + blocks[j + 1];
      t2 = s0 + maj;
      g = c + t1 << 0;
      c = t1 + t2 << 0;
      s0 = ((c >>> 2) | (c << 30)) ^ ((c >>> 13) | (c << 19)) ^ ((c >>> 22) | (c << 10));
      s1 = ((g >>> 6) | (g << 26)) ^ ((g >>> 11) | (g << 21)) ^ ((g >>> 25) | (g << 7));
      cd = c & d;
      maj = cd ^ (c & a) ^ da;
      ch = (g & h) ^ (~g & e);
      t1 = f + s1 + ch + K[j + 2] + blocks[j + 2];
      t2 = s0 + maj;
      f = b + t1 << 0;
      b = t1 + t2 << 0;
      s0 = ((b >>> 2) | (b << 30)) ^ ((b >>> 13) | (b << 19)) ^ ((b >>> 22) | (b << 10));
      s1 = ((f >>> 6) | (f << 26)) ^ ((f >>> 11) | (f << 21)) ^ ((f >>> 25) | (f << 7));
      bc = b & c;
      maj = bc ^ (b & d) ^ cd;
      ch = (f & g) ^ (~f & h);
      t1 = e + s1 + ch + K[j + 3] + blocks[j + 3];
      t2 = s0 + maj;
      e = a + t1 << 0;
      a = t1 + t2 << 0;
    }

    this.h0 = this.h0 + a << 0;
    this.h1 = this.h1 + b << 0;
    this.h2 = this.h2 + c << 0;
    this.h3 = this.h3 + d << 0;
    this.h4 = this.h4 + e << 0;
    this.h5 = this.h5 + f << 0;
    this.h6 = this.h6 + g << 0;
    this.h7 = this.h7 + h << 0;
  };

  Sha256.prototype.digest = function () {
    this.finalize();

    var h0 = this.h0, h1 = this.h1, h2 = this.h2, h3 = this.h3, h4 = this.h4, h5 = this.h5,
      h6 = this.h6, h7 = this.h7;

    var arr = [
      (h0 >> 24) & 0xFF, (h0 >> 16) & 0xFF, (h0 >> 8) & 0xFF, h0 & 0xFF,
      (h1 >> 24) & 0xFF, (h1 >> 16) & 0xFF, (h1 >> 8) & 0xFF, h1 & 0xFF,
      (h2 >> 24) & 0xFF, (h2 >> 16) & 0xFF, (h2 >> 8) & 0xFF, h2 & 0xFF,
      (h3 >> 24) & 0xFF, (h3 >> 16) & 0xFF, (h3 >> 8) & 0xFF, h3 & 0xFF,
      (h4 >> 24) & 0xFF, (h4 >> 16) & 0xFF, (h4 >> 8) & 0xFF, h4 & 0xFF,
      (h5 >> 24) & 0xFF, (h5 >> 16) & 0xFF, (h5 >> 8) & 0xFF, h5 & 0xFF,
      (h6 >> 24) & 0xFF, (h6 >> 16) & 0xFF, (h6 >> 8) & 0xFF, h6 & 0xFF
    ];
    if (!this.is224) {
      arr.push((h7 >> 24) & 0xFF, (h7 >> 16) & 0xFF, (h7 >> 8) & 0xFF, h7 & 0xFF);
    }
    return arr;
  };

  // Create sha256 function
  var sha256 = {
    create: function() {
      return new Sha256(false);
    }
  };

  // ========== Anki Package Generator ==========

  // Base91 character set for Anki's GUID encoding
  const BASE91_CHARS = 
    'abcdefghijklmnopqrstuvwxyz' +
    'ABCDEFGHIJKLMNOPQRSTUVWXYZ' +
    '0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~';

  /**
   * Generate a unique identifier for a note based on its field content
   */
  function generateNoteId(fieldValues) {
    const combined = fieldValues.join('__');
    const hash = sha256.create();
    hash.update(combined);
    const digest = hash.digest();

    // Convert first 8 bytes to BigInt
    let num = 0n;
    for (let i = 0; i < 8; i++) {
      num = num * 256n + BigInt(digest[i]);
    }

    // Encode in base91
    const result = [];
    while (num > 0n) {
      result.push(BASE91_CHARS[Number(num % 91n)]);
      num = num / 91n;
    }

    return result.reverse().join('');
  }

  // Card model types
  const CardModelType = {
    STANDARD: 0,
    CLOZE: 1
  };

  // New card distribution options
  const NewCardOrder = {
    MIXED: 0,
    END: 1,
    START: 2
  };

  /**
   * Represents a card template within a model
   */
  class CardTemplate {
    constructor(options = {}) {
      this.name = options.name || 'Card 1';
      this.questionFormat = options.questionFormat || options.qfmt || '';
      this.answerFormat = options.answerFormat || options.afmt || '';
      this.order = options.order ?? 0;
    }

    toJSON() {
      return {
        name: this.name,
        qfmt: this.questionFormat,
        afmt: this.answerFormat,
        ord: this.order,
        bqfmt: '',
        bafmt: '',
        did: null
      };
    }
  }

  /**
   * Represents a field definition in a card model
   */
  class FieldDefinition {
    constructor(options = {}) {
      this.name = options.name || '';
      this.order = options.order ?? 0;
      this.font = options.font || 'Arial';
      this.size = options.size || 20;
      this.sticky = options.sticky || false;
      this.rightToLeft = options.rtl || false;
    }

    toJSON() {
      return {
        name: this.name,
        ord: this.order,
        sticky: this.sticky,
        rtl: this.rightToLeft,
        font: this.font,
        size: this.size,
        media: []
      };
    }
  }

  /**
   * Card model definition
   */
  class CardModel {
    constructor(options = {}) {
      this.id = options.id || Date.now().toString();
      this.name = options.name || 'Model';
      this.type = options.type ?? CardModelType.STANDARD;
      this.sortFieldIndex = options.sortFieldIndex ?? 0;
      
      // Setup fields
      this.fields = (options.fields || options.flds || []).map((f, i) => {
        if (f instanceof FieldDefinition) return f;
        return new FieldDefinition({ ...f, order: i });
      });

      // Setup templates
      this.templates = (options.templates || options.tmpls || []).map((t, i) => {
        if (t instanceof CardTemplate) return t;
        return new CardTemplate({ ...t, order: i });
      });

      this.css = options.css || this._defaultCSS();
      this.fieldMap = {};
      this.fields.forEach(f => this.fieldMap[f.name] = f.order);
    }

    _defaultCSS() {
      return `.card {
  font-family: arial;
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
}`;
    }

    createNote(fieldData, tags = [], guid = null) {
      let fieldArray;

      if (Array.isArray(fieldData)) {
        if (fieldData.length !== this.fields.length) {
          throw new Error(
            `Field count mismatch: expected ${this.fields.length}, got ${fieldData.length}`
          );
        }
        fieldArray = fieldData;
      } else {
        // Object with field names
        fieldArray = new Array(this.fields.length);
        for (const [name, value] of Object.entries(fieldData)) {
          const idx = this.fieldMap[name];
          if (idx === undefined) {
            throw new Error(`Unknown field: ${name}`);
          }
          fieldArray[idx] = value;
        }
      }

      return new FlashcardNote(this, fieldArray, tags, guid);
    }

    // Backward compatibility alias
    note(fieldData, tags = [], guid = null) {
      return this.createNote(fieldData, tags, guid);
    }

    toJSON() {
      return {
        id: this.id,
        name: this.name,
        type: this.type,
        mod: Math.floor(Date.now() / 1000),
        flds: this.fields.map(f => f.toJSON()),
        tmpls: this.templates.map(t => t.toJSON()),
        css: this.css,
        sortf: this.sortFieldIndex,
        did: 1,
        usn: 0,
        vers: [],
        tags: [],
        req: this._calculateRequirements(),
        latexPre: `\\documentclass[12pt]{article}
\\special{papersize=3in,5in}
\\usepackage[utf8]{inputenc}
\\usepackage{amssymb,amsmath}
\\pagestyle{empty}
\\setlength{\\parindent}{0in}
\\begin{document}`,
        latexPost: '\\end{document}'
      };
    }

    _calculateRequirements() {
      // Calculate which fields are required for each template
      // For simplicity, require at least one non-empty field
      return this.templates.map((t, i) => [i, 'any', [0]]);
    }
  }

  /**
   * Cloze deletion model (for fill-in-the-blank cards)
   */
  class ClozeCardModel extends CardModel {
    constructor(options = {}) {
      const template = options.template || options.tmpl || {};
      
      super({
        ...options,
        type: CardModelType.CLOZE,
        templates: [{
          name: 'Cloze',
          questionFormat: template.qfmt || template.questionFormat || '',
          answerFormat: template.afmt || template.answerFormat || ''
        }],
        css: options.css || `.card {
  font-family: arial;
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
}

.cloze {
  font-weight: bold;
  color: blue;
}`
      });
    }
  }

  /**
   * Represents a single flashcard note
   */
  class FlashcardNote {
    constructor(model, fieldValues, tags = [], guid = null) {
      this.model = model;
      this.fieldValues = fieldValues;
      this.tags = tags || [];
      this.customGuid = guid;
    }

    get guid() {
      return this.customGuid || generateNoteId(this.fieldValues);
    }

    get cardIndices() {
      if (this.model.type === CardModelType.STANDARD) {
        return this._getStandardCardIndices();
      } else {
        return this._getClozeCardIndices();
      }
    }

    _getStandardCardIndices() {
      const isFieldEmpty = (val) => !val || String(val).trim().length === 0;
      const indices = [];

      // Check requirements from model
      const req = this.model.toJSON().req || [];
      
      if (req.length > 0) {
        for (const [cardOrd, anyOrAll, requiredFieldOrds] of req) {
          const checkFn = anyOrAll === 'any' ? 'some' : 'every';
          if (requiredFieldOrds[checkFn](f => !isFieldEmpty(this.fieldValues[f]))) {
            indices.push(cardOrd);
          }
        }
      } else {
        // Fallback: if any field has content, generate all cards
        const hasContent = this.fieldValues.some(v => !isFieldEmpty(v));
        if (hasContent) {
          for (let i = 0; i < this.model.templates.length; i++) {
            indices.push(i);
          }
        }
      }

      return indices;
    }

    _getClozeCardIndices() {
      const clozeNumbers = new Set();
      const template = this.model.templates[0];
      
      // Find which fields are used in the template
      const fieldPattern = /{{[^}]*?cloze:(?:[^}]?:)*(.+?)}}/g;
      const usedFields = [];
      let match;
      
      while ((match = fieldPattern.exec(template.questionFormat))) {
        usedFields.push(match[1]);
      }

      // Extract cloze numbers from field content
      for (const fieldName of usedFields) {
        const fieldIdx = this.model.fieldMap[fieldName];
        if (fieldIdx === undefined) continue;
        
        const content = this.fieldValues[fieldIdx] || '';
        const clozePattern = /{{c(\d+)::.+?}}/g;
        
        while ((match = clozePattern.exec(content))) {
          const num = parseInt(match[1]);
          if (num > 0) {
            clozeNumbers.add(num - 1);
          }
        }
      }

      return clozeNumbers.size > 0 ? Array.from(clozeNumbers) : [0];
    }
  }

  /**
   * Represents a deck of flashcards
   */
  class FlashcardDeck {
    constructor(deckId, name, description = '') {
      this.id = deckId;
      this.name = name;
      this.description = description;
      this.notes = [];
    }

    addNote(note) {
      this.notes.push(note);
      return this;
    }

    toJSON() {
      return {
        id: this.id,
        name: this.name,
        desc: this.description,
        mod: Math.floor(Date.now() / 1000),
        usn: 0,
        collapsed: false,
        conf: 1,
        dyn: 0,
        newToday: [0, 0],
        revToday: [0, 0],
        lrnToday: [0, 0],
        timeToday: [0, 0],
        extendNew: 10,
        extendRev: 50
      };
    }
  }

  /**
   * Main package builder for creating .apkg files
   */
  class AnkiPackage {
    constructor() {
      this.decks = [];
      this.mediaFiles = [];
    }

    addDeck(deck) {
      this.decks.push(deck);
      return this;
    }

    // Backward compatibility alias
    addNote(note) {
      console.warn('addNote() is deprecated, use addDeck() instead');
      return this;
    }

    addMediaData(data, filename) {
      this.mediaFiles.push({ data, filename });
      return this;
    }

    addMediaFile(filepath, filename = null) {
      this.mediaFiles.push({ 
        filepath, 
        filename: filename || filepath 
      });
      return this;
    }

    async save(filename) {
      const db = new SQL.Database();
      db.run(ANKI_SCHEMA);
      
      this._writeDatabase(db);
      
      const zip = new JSZip();
      const dbData = db.export();
      zip.file('collection.anki2', new Uint8Array(dbData).buffer);

      // Add media files
      const mediaIndex = {};
      this.mediaFiles.forEach((media, idx) => {
        if (media.filepath) {
          zip.file(String(idx), media.filepath);
        } else {
          zip.file(String(idx), media.data);
        }
        mediaIndex[idx] = media.filename;
      });

      zip.file('media', JSON.stringify(mediaIndex));

      const blob = await zip.generateAsync({ 
        type: 'blob', 
        mimeType: 'application/apkg' 
      });
      
      saveAs(blob, filename);
    }

    // Backward compatibility alias
    writeToFile(filename) {
      return this.save(filename);
    }

    _writeDatabase(db) {
      const timestamp = Date.now();
      const timestampSec = Math.floor(timestamp / 1000);
      
      // Collect all models and decks
      const models = {};
      const decks = { 
        '1': {
          id: 1,
          name: 'Default',
          desc: '',
          mod: timestampSec,
          usn: 0,
          collapsed: false,
          conf: 1,
          dyn: 0,
          newToday: [0, 0],
          revToday: [0, 0],
          lrnToday: [0, 0],
          timeToday: [0, 0],
          extendNew: 10,
          extendRev: 50
        }
      };

      for (const deck of this.decks) {
        for (const note of deck.notes) {
          models[note.model.id] = note.model.toJSON();
        }
        decks[deck.id] = deck.toJSON();
      }

      // Insert collection metadata
      db.prepare(`
        INSERT INTO col (id, crt, mod, scm, ver, dty, usn, ls, conf, models, decks, dconf, tags)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run([
        null,
        timestampSec,
        timestamp,
        timestamp,
        11,
        0,
        0,
        0,
        JSON.stringify({
          activeDecks: [1],
          curDeck: 1,
          newSpread: NewCardOrder.MIXED,
          collapseTime: 1200,
          timeLim: 0,
          estTimes: true,
          dueCounts: true,
          curModel: null,
          nextPos: 1,
          sortType: 'noteFld',
          sortBackwards: false,
          addToCur: true,
          dayLearnFirst: false
        }),
        JSON.stringify(models),
        JSON.stringify(decks),
        JSON.stringify({
          '1': {
            id: 1,
            name: 'Default',
            mod: 0,
            usn: 0,
            maxTaken: 60,
            timer: 0,
            autoplay: true,
            replayq: true,
            new: {
              delays: [1, 10],
              ints: [1, 4, 7],
              initialFactor: 2500,
              separate: true,
              order: 1,
              perDay: 20,
              bury: false
            },
            lapse: {
              delays: [10],
              mult: 0,
              minInt: 1,
              leechFails: 8,
              leechAction: 0
            },
            rev: {
              perDay: 200,
              ease4: 1.3,
              fuzz: 0.05,
              minSpace: 1,
              ivlFct: 1,
              maxIvl: 36500,
              bury: false,
              hardFactor: 1.2
            }
          }
        }),
        JSON.stringify({})
      ]);

      const insertNote = db.prepare(`
        INSERT INTO notes (id, guid, mid, mod, usn, tags, flds, sfld, csum, flags, data)
        VALUES (null, ?, ?, ?, ?, ?, ?, ?, 0, 0, '')
      `);

      const insertCard = db.prepare(`
        INSERT INTO cards (id, nid, did, ord, mod, usn, type, queue, due, ivl, factor, reps, lapses, left, odue, odid, flags, data)
        VALUES (null, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, '')
      `);

      for (const deck of this.decks) {
        for (const note of deck.notes) {
          const tagString = note.tags.length > 0 ? note.tags.join(' ') : '';
          
          insertNote.run([
            note.guid,
            note.model.id,
            timestampSec,
            -1,
            tagString,
            note.fieldValues.join('\x1f'),
            0
          ]);

          const result = db.exec('SELECT last_insert_rowid()');
          const noteId = result[0].values[0][0];

          for (const cardIdx of note.cardIndices) {
            insertCard.run([
              noteId,
              deck.id,
              cardIdx,
              timestampSec,
              -1,
              0,
              0
            ]);
          }
        }
      }
    }
  }

  // Database schema for Anki package
  const ANKI_SCHEMA = `
PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE col (
    id              integer primary key,
    crt             integer not null,
    mod             integer not null,
    scm             integer not null,
    ver             integer not null,
    dty             integer not null,
    usn             integer not null,
    ls              integer not null,
    conf            text not null,
    models          text not null,
    decks           text not null,
    dconf           text not null,
    tags            text not null
);
CREATE TABLE notes (
    id              integer primary key,
    guid            text not null,
    mid             integer not null,
    mod             integer not null,
    usn             integer not null,
    tags            text not null,
    flds            text not null,
    sfld            integer not null,
    csum            integer not null,
    flags           integer not null,
    data            text not null
);
CREATE TABLE cards (
    id              integer primary key,
    nid             integer not null,
    did             integer not null,
    ord             integer not null,
    mod             integer not null,
    usn             integer not null,
    type            integer not null,
    queue           integer not null,
    due             integer not null,
    ivl             integer not null,
    factor          integer not null,
    reps            integer not null,
    lapses          integer not null,
    left            integer not null,
    odue            integer not null,
    odid            integer not null,
    flags           integer not null,
    data            text not null
);
CREATE TABLE revlog (
    id              integer primary key,
    cid             integer not null,
    usn             integer not null,
    ease            integer not null,
    ivl             integer not null,
    lastIvl         integer not null,
    factor          integer not null,
    time            integer not null,
    type            integer not null
);
CREATE TABLE graves (
    usn             integer not null,
    oid             integer not null,
    type            integer not null
);
CREATE INDEX ix_notes_usn on notes (usn);
CREATE INDEX ix_cards_usn on cards (usn);
CREATE INDEX ix_revlog_usn on revlog (usn);
CREATE INDEX ix_cards_nid on cards (nid);
CREATE INDEX ix_cards_sched on cards (did, queue, due);
CREATE INDEX ix_revlog_cid on revlog (cid);
CREATE INDEX ix_notes_csum on notes (csum);
COMMIT;
`;

  // Export to global scope for browser use
  global.AnkiPackage = AnkiPackage;
  global.FlashcardDeck = FlashcardDeck;
  global.CardModel = CardModel;
  global.ClozeCardModel = ClozeCardModel;
  global.CardTemplate = CardTemplate;
  global.FieldDefinition = FieldDefinition;
  global.CardModelType = CardModelType;
  global.NewCardOrder = NewCardOrder;

  // Also support the old API names for backward compatibility
  global.Package = AnkiPackage;
  global.Deck = FlashcardDeck;
  global.Model = CardModel;
  global.ClozeModel = ClozeCardModel;

})(typeof window !== 'undefined' ? window : this);