/**
 * GOOGLE SHEETS SYNC ENGINE
 * Core data transformation layer for bi-directional sync between
 * Google Sheets (Web Lead + Follow Up tabs) and Supabase.
 * 
 * Sheet structure (both tabs):
 *   A: Notes/Short label/Date separator
 *   B: Name
 *   C: Phone (various formats: p:, +91, plain)
 *   D: City
 *   E: Capital (20K, 2 lakh, 50k, etc.)
 *   F: Feedback (Hinglish notes)
 * 
 * Color coding:
 *   Green       → done enquiry (trader)
 *   Grey shades → not interested
 *   Sky blue    → converted
 *   Purple      → google meet / long conversation done
 */

// ═══════════════════════════════════════════════════════
// PHONE NORMALIZATION
// ═══════════════════════════════════════════════════════

/**
 * Normalize any phone format into a clean 10-digit Indian number.
 * Handles: p:919876543210, +91-98765 43210, 09876543210, 91999/15/977, etc.
 */
export function normalizePhone(raw) {
  if (!raw) return '';
  let phone = String(raw).trim();

  // Strip "p:" prefix (common in the sheets)
  phone = phone.replace(/^p:\s*/i, '');

  // Remove all non-digit characters (spaces, dashes, slashes, +, parens)
  phone = phone.replace(/[^\d]/g, '');

  // Strip leading country code
  if (phone.startsWith('91') && phone.length > 10) {
    phone = phone.slice(phone.length - 10);
  }
  if (phone.startsWith('0') && phone.length === 11) {
    phone = phone.slice(1);
  }

  // Return last 10 digits (failsafe)
  if (phone.length > 10) {
    phone = phone.slice(-10);
  }

  return phone;
}

/**
 * Format phone for display: +91 XXXXX XXXXX
 */
export function formatPhoneDisplay(phone) {
  const clean = normalizePhone(phone);
  if (clean.length !== 10) return phone; // fallback to raw
  return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
}

// ═══════════════════════════════════════════════════════
// DATE HEADER DETECTION
// ═══════════════════════════════════════════════════════

/**
 * Detect if a row is a date separator (e.g., "28-05-2026", "30-05-2026").
 * These rows have dates in one cell and other cells empty.
 */
export function isDateHeaderRow(row) {
  if (!row || !Array.isArray(row)) return false;

  // Check each cell for a date pattern
  const datePatterns = [
    /^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}$/, // 28-05-2026, 28/05/26
    /^\d{2,4}[-/.]\d{1,2}[-/.]\d{1,2}$/, // 2026-05-28
  ];

  // Count non-empty cells
  const nonEmpty = row.filter(cell => cell && String(cell).trim()).length;

  // Date headers typically have 1-2 non-empty cells, one being a date
  if (nonEmpty > 2) return false;

  return row.some(cell => {
    const val = String(cell || '').trim();
    return datePatterns.some(p => p.test(val));
  });
}

/**
 * Extract date from a date header row.
 */
export function extractDateFromHeader(row) {
  if (!row) return null;
  for (const cell of row) {
    const val = String(cell || '').trim();
    // Try DD-MM-YYYY
    const match = val.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
    if (match) {
      const [, d, m, y] = match;
      const year = y.length === 2 ? `20${y}` : y;
      return new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// CAPITAL PARSING
// ═══════════════════════════════════════════════════════

/**
 * Parse capital strings into numeric value.
 * Handles: "20K", "2 lakh", "50k", "4.20 lakh / 2.70", "30 K Capital", "10k capital"
 */
export function parseCapital(raw) {
  if (!raw) return { display: '', numeric: 0 };
  const str = String(raw).trim();

  // Try to extract the primary number
  let numeric = 0;

  // Match patterns like "2 lakh", "4.20 lakh"
  const lakhMatch = str.match(/([\d.]+)\s*(?:lakh|lac|L)/i);
  if (lakhMatch) {
    numeric = parseFloat(lakhMatch[1]) * 100000;
    return { display: str, numeric: Math.round(numeric) };
  }

  // Match patterns like "20K", "50k", "30 K"
  const kMatch = str.match(/([\d.]+)\s*k/i);
  if (kMatch) {
    numeric = parseFloat(kMatch[1]) * 1000;
    return { display: str, numeric: Math.round(numeric) };
  }

  // Match patterns like "20000", "100000"
  const plainMatch = str.match(/([\d,]+)/);
  if (plainMatch) {
    numeric = parseInt(plainMatch[1].replace(/,/g, ''), 10);
    return { display: str, numeric: numeric || 0 };
  }

  return { display: str, numeric: 0 };
}

// ═══════════════════════════════════════════════════════
// COLOR → STATUS MAPPING
// ═══════════════════════════════════════════════════════

/**
 * Google Sheets background colors → Pipeline status.
 * Colors are in hex format from the Sheets API.
 *
 * User-confirmed mapping:
 *   Green       → done enquiry → discovery (trader confirmed, exploring)
 *   Grey shades → not interested → lost
 *   Sky blue    → converted → converted
 *   Purple      → google meet done → demo_done
 */

// Threshold-based color matcher (colors vary slightly in sheets)
export function mapColorToStatus(bgColor) {
  if (!bgColor) return null;

  // Normalize to hex
  const hex = colorToHex(bgColor);
  if (!hex || hex === '#ffffff' || hex === '#000000') return null;

  const { h, s, l } = hexToHSL(hex);

  // Green (hue ~90-160, saturation > 20%)
  if (h >= 80 && h <= 170 && s > 15 && l > 25 && l < 85) {
    return 'discovery'; // Done enquiry — trader
  }

  // Sky blue / Cyan (hue ~180-210, saturation > 20%)
  if (h >= 170 && h <= 220 && s > 20 && l > 30 && l < 85) {
    return 'converted'; // Converted
  }

  // Purple / Violet (hue ~260-310, saturation > 15%)
  if (h >= 250 && h <= 320 && s > 15 && l > 20 && l < 85) {
    return 'demo_done'; // Google meet / long conversation done
  }

  // Grey shades (saturation < 15%, lightness 30-80%)
  if (s < 15 && l > 25 && l < 85) {
    return 'lost'; // Not interested
  }

  return null;
}

/**
 * Reverse: Pipeline status → Google Sheet hex color
 */
export function statusToSheetColor(status) {
  const map = {
    discovery: '#93c47d',      // Green (done enquiry)
    demo_scheduled: '#93c47d', // Green variant
    demo_done: '#b4a7d6',      // Purple (meet done)
    negotiation: '#b4a7d6',    // Purple variant
    converted: '#a4c2f4',      // Sky blue
    lost: '#cccccc',           // Grey
    fresh_enquiry: null,       // No color (white)
    first_call: null,
    npc_retry: null,
  };
  return map[status] || null;
}

// ═══════════════════════════════════════════════════════
// COLOR UTILITIES
// ═══════════════════════════════════════════════════════

function colorToHex(color) {
  if (!color) return null;

  // Already hex
  if (typeof color === 'string' && color.startsWith('#')) {
    return color.toLowerCase();
  }

  // Google Sheets API returns color as { red, green, blue } (0-1 floats)
  if (typeof color === 'object' && ('red' in color || 'green' in color || 'blue' in color)) {
    const r = Math.round((color.red || 0) * 255);
    const g = Math.round((color.green || 0) * 255);
    const b = Math.round((color.blue || 0) * 255);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  // RGB string: rgb(r, g, b)
  if (typeof color === 'string') {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      const [, r, g, b] = match;
      return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
    }
  }

  return null;
}

function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) * 60; break;
      case g: h = ((b - r) / d + 2) * 60; break;
      case b: h = ((r - g) / d + 4) * 60; break;
    }
  }

  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// ═══════════════════════════════════════════════════════
// SHEET ROW ↔ LEAD CONVERSION
// ═══════════════════════════════════════════════════════

/**
 * Convert a raw Google Sheet row into a normalized lead object.
 * @param {Array} row - [A, B, C, D, E, F, ...] cell values
 * @param {number} rowIndex - 1-based row number in the sheet
 * @param {string} sheetTab - 'web_lead' or 'follow_up'
 * @param {string|null} bgColor - Row background color (hex or Sheets API color object)
 * @param {Date|null} dateContext - Date from the nearest date header above this row
 */
export function parseSheetRow(row, rowIndex, sheetTab = 'web_lead', bgColor = null, dateContext = null) {
  if (!row || !Array.isArray(row) || row.length < 3) return null;

  const [colA, colB, colC, colD, colE, colF] = row.map(c => String(c || '').trim());

  // Name and phone are mandatory
  const name = colB;
  const phone = normalizePhone(colC);
  if (!name || !phone || phone.length < 7) return null;

  const capital = parseCapital(colE);
  const statusFromColor = bgColor ? mapColorToStatus(bgColor) : null;

  return {
    name,
    phone,
    city: colD || null,
    capital: colE || null,
    capital_numeric: capital.numeric,
    notes: colF || null,
    short_note: colA || null,
    source: sheetTab === 'web_lead' ? 'web_lead_sheet' : 'followup_sheet',
    lead_type: sheetTab,
    sheet_row_number: rowIndex,
    sheet_tab: sheetTab,
    sheet_color: bgColor ? colorToHex(bgColor) : null,
    status: statusFromColor || 'fresh_enquiry',
    synced_from_sheet: true,
    created_context_date: dateContext ? dateContext.toISOString() : null,
  };
}

/**
 * Convert a Supabase lead back into a sheet row array.
 * @param {Object} lead - Lead object from Supabase
 * @returns {Array} [A, B, C, D, E, F] cell values
 */
export function leadToSheetRow(lead) {
  return [
    lead.follow_up_note || lead.next_step || '',        // A: Short note
    lead.name || '',                                     // B: Name
    lead.phone ? `p:${lead.phone}` : '',                // C: Phone (with p: prefix)
    lead.city || '',                                     // D: City
    lead.capital || '',                                  // E: Capital
    lead.notes || '',                                    // F: Feedback
  ];
}

// ═══════════════════════════════════════════════════════
// DEDUPLICATION ENGINE
// ═══════════════════════════════════════════════════════

/**
 * Merge sheet rows with existing DB leads, deduplicating by phone.
 * Returns: { toInsert, toUpdate, unchanged, conflicts }
 */
export function diffAndSync(sheetRows, dbLeads) {
  const dbByPhone = new Map();
  dbLeads.forEach(lead => {
    const phone = normalizePhone(lead.phone);
    if (phone) dbByPhone.set(phone, lead);
  });

  const toInsert = [];
  const toUpdate = [];
  const unchanged = [];
  const conflicts = [];

  const seenPhones = new Set();

  sheetRows.forEach(sheetLead => {
    if (!sheetLead) return;
    const phone = normalizePhone(sheetLead.phone);
    if (!phone || seenPhones.has(phone)) return; // Skip dupes within sheet
    seenPhones.add(phone);

    const existing = dbByPhone.get(phone);

    if (!existing) {
      // New lead — insert
      toInsert.push(sheetLead);
    } else {
      // Exists — check if anything changed
      const changes = {};
      let hasChanges = false;

      // Only update fields that are non-empty in sheet and different from DB
      const fieldsToCompare = ['name', 'city', 'capital', 'notes', 'status'];
      fieldsToCompare.forEach(field => {
        const sheetVal = sheetLead[field];
        const dbVal = existing[field];
        if (sheetVal && sheetVal !== dbVal) {
          changes[field] = sheetVal;
          hasChanges = true;
        }
      });

      // Special: sheet color override for status (if color is set and maps to a known status)
      if (sheetLead.sheet_color && sheetLead.status !== 'fresh_enquiry') {
        if (sheetLead.status !== existing.status) {
          changes.status = sheetLead.status;
          hasChanges = true;
        }
      }

      if (hasChanges) {
        toUpdate.push({ id: existing.id, phone, changes, sheetLead });
      } else {
        unchanged.push(existing);
      }
    }
  });

  return { toInsert, toUpdate, unchanged, conflicts };
}

// ═══════════════════════════════════════════════════════
// FULL SHEET PARSER
// ═══════════════════════════════════════════════════════

/**
 * Parse an entire sheet tab (array of rows) into an array of lead objects.
 * Handles date headers, empty rows, and color data.
 * 
 * @param {Array<Array>} rows - 2D array of cell values
 * @param {string} sheetTab - 'web_lead' or 'follow_up'
 * @param {Array<Object>} rowColors - Optional array of { row, bgColor } from Sheets API
 */
export function parseFullSheet(rows, sheetTab = 'web_lead', rowColors = []) {
  if (!rows || !Array.isArray(rows)) return [];

  const leads = [];
  let currentDate = null;

  // Build a color lookup: rowIndex → hex color
  const colorMap = new Map();
  rowColors.forEach(rc => {
    if (rc.row != null && rc.bgColor) {
      colorMap.set(rc.row, rc.bgColor);
    }
  });

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // 2-based index (since raw rows are fetched starting from Row 2)

    // Skip empty rows
    if (!row || row.every(c => !c || !String(c).trim())) return;

    // Check for date header
    if (isDateHeaderRow(row)) {
      currentDate = extractDateFromHeader(row);
      return;
    }

    // Skip the header row (row 1 typically)
    if (rowNum === 1) {
      // Check if it's actually a header
      const firstCell = String(row[0] || '').toLowerCase();
      const secondCell = String(row[1] || '').toLowerCase();
      if (firstCell.includes('note') || firstCell.includes('date') || secondCell.includes('name')) {
        return; // Skip header
      }
    }

    // Parse data row
    const bgColor = colorMap.get(rowNum) || null;
    const lead = parseSheetRow(row, rowNum, sheetTab, bgColor, currentDate);
    if (lead) {
      leads.push(lead);
    }
  });

  return leads;
}

// ═══════════════════════════════════════════════════════
// SHEET COLOR DISPLAY HELPERS
// ═══════════════════════════════════════════════════════

export const SHEET_COLOR_LEGEND = [
  { color: '#93c47d', label: 'Done Enquiry (Trader)', status: 'discovery', emoji: '🟢' },
  { color: '#a4c2f4', label: 'Converted', status: 'converted', emoji: '🔵' },
  { color: '#b4a7d6', label: 'Google Meet / Long Call', status: 'demo_done', emoji: '🟣' },
  { color: '#cccccc', label: 'Not Interested', status: 'lost', emoji: '⚪' },
  { color: '#ffffff', label: 'Fresh / Untouched', status: 'fresh_enquiry', emoji: '⬜' },
];

export const SHEET_TABS = [
  { id: 'web_lead', gid: '0', label: 'web lead', icon: '🌐', leadType: 'web_lead' },
];

// The single spreadsheet ID
export const SPREADSHEET_ID = '1QnB8S58UPFUxNg-nZl449l-zUlqV7d5qJ8C8ZPsuKQw';
