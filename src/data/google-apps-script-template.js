/**
 * GOOGLE APPS SCRIPT TEMPLATE
 * 
 * This file contains the pre-built Google Apps Script code that users
 * paste into their Google Sheet to enable bi-directional sync.
 * 
 * The script is exported as a string template that gets displayed
 * in the SheetsSettings UI with a "Copy to Clipboard" button.
 */

export function generateAppsScript(supabaseUrl, supabaseAnonKey, assignedUserId = '') {
  return `// ═══════════════════════════════════════════════════════
// SALES COMMAND OS — Google Sheets Sync Script
// Paste this into Extensions → Apps Script in your Google Sheet
// ═══════════════════════════════════════════════════════

// ── CONFIGURATION (auto-filled from your SalesOS) ──
const SUPABASE_URL = '${supabaseUrl || 'YOUR_SUPABASE_URL'}';
const SUPABASE_KEY = '${supabaseAnonKey || 'YOUR_SUPABASE_ANON_KEY'}';
const ASSIGNED_USER_ID = '${assignedUserId || ''}'; // Auto-filled from your SalesOS profile

// ── TAB CONFIGURATION (Prioritized: web lead) ──
const TAB_CONFIG = {
  'web lead': { leadType: 'web_lead', source: 'web_lead_sheet' }
};

// ── COLUMN MAPPING (A=0, B=1, C=2, D=3, E=4, F=5) ──
const COL = {
  SHORT_NOTE: 0,  // A: Short note / date label
  NAME: 1,        // B: Lead name
  PHONE: 2,       // C: Phone number
  CITY: 3,        // D: City
  CAPITAL: 4,     // E: Capital
  FEEDBACK: 5,    // F: Feedback / Notes
};

// ═══════════════════════════════════════════════════════
// TRIGGERS — Set up these in Apps Script editor
// ═══════════════════════════════════════════════════════

/**
 * Runs automatically when any cell is edited.
 * Syncs the changed row to Supabase.
 */
function onEdit(e) {
  try {
    const sheet = e.source.getActiveSheet();
    const tabName = sheet.getName();
    
    // Only sync configured tabs
    if (!TAB_CONFIG[tabName]) return;
    
    const row = e.range.getRow();
    if (row < 2) return; // Skip header
    
    // Get the full row data
    const rowData = sheet.getRange(row, 1, 1, 6).getValues()[0];
    
    // Skip if this is a date separator row
    if (isDateRow(rowData)) return;
    
    const name = String(rowData[COL.NAME] || '').trim();
    const phone = normalizePhone(String(rowData[COL.PHONE] || ''));
    
    // Skip if no name or phone
    if (!name || !phone || phone.length < 7) return;
    
    // Get row background color
    const bgColor = sheet.getRange(row, 1).getBackground();
    const status = mapColorToStatus(bgColor);
    
    // Parse capital
    const capitalNumeric = parseCapitalToNumber(String(rowData[COL.CAPITAL] || ''));
    
    // Scan upwards to find nearest date header above this row
    const dateContext = findDateHeaderAbove(sheet, row);
    
    // Build lead data
    const leadData = {
      name: name,
      phone: phone,
      city: String(rowData[COL.CITY] || '').trim() || null,
      capital: String(rowData[COL.CAPITAL] || '').trim() || null,
      capital_numeric: capitalNumeric,
      notes: String(rowData[COL.FEEDBACK] || '').trim() || null,
      source: TAB_CONFIG[tabName].source,
      lead_type: TAB_CONFIG[tabName].leadType,
      status: status || 'fresh_enquiry',
      sheet_row_number: row,
      sheet_tab: tabName,
      sheet_color: bgColor,
      synced_from_sheet: true,
      last_sheet_sync_at: new Date().toISOString(),
    };
    
    if (dateContext) {
      leadData.created_at = dateContext;
      leadData.enquiry_date = dateContext;
    }
    
    if (ASSIGNED_USER_ID) {
      leadData.assigned_to = ASSIGNED_USER_ID;
    }
    
    // Upsert to Supabase (check by phone number)
    upsertLead(leadData);
    
  } catch (err) {
    console.error('onEdit sync error:', err);
  }
}

/**
 * Add custom menu to the sheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('⚡ SalesOS')
    .addItem('🔄 Sync All to SalesOS', 'syncAllRows')
    .addItem('⬇️ Pull from SalesOS', 'pullFromSalesOS')
    .addItem('📊 Sync Status', 'showSyncStatus')
    .addSeparator()
    .addItem('⚙️ Configuration', 'showConfig')
    .addToUi();
}

// ═══════════════════════════════════════════════════════
// SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════

/**
 * Full sync: Push all rows from current tab to Supabase
 */
function syncAllRows() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const tabName = sheet.getName();
  
  if (!TAB_CONFIG[tabName]) {
    SpreadsheetApp.getUi().alert('This tab is not configured for sync. Use "web lead" tab.');
    return;
  }
  
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Sync to SalesOS',
    'This will sync all rows from "' + tabName + '" to SalesOS.\\nExisting leads (by phone) will be updated, new ones will be added.\\n\\nContinue?',
    ui.ButtonSet.YES_NO
  );
  
  if (response !== ui.Button.YES) return;
  
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    ui.alert('No data rows found.');
    return;
  }
  
  const allData = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const backgrounds = sheet.getRange(2, 1, lastRow - 1, 1).getBackgrounds();
  
  let synced = 0, skipped = 0, errors = 0;
  let currentDateContext = null;
  
  allData.forEach(function(rowData, idx) {
    // 1. Check if it is a date row and update context
    if (isDateRow(rowData)) {
      currentDateContext = extractDateFromRow(rowData);
      skipped++;
      return;
    }

    const name = String(rowData[COL.NAME] || '').trim();
    const phone = normalizePhone(String(rowData[COL.PHONE] || ''));
    
    // Skip empty rows
    if (!name || !phone || phone.length < 7) {
      skipped++;
      return;
    }
    
    const bgColor = backgrounds[idx][0];
    const status = mapColorToStatus(bgColor);
    const capitalNumeric = parseCapitalToNumber(String(rowData[COL.CAPITAL] || ''));
    
    const leadData = {
      name: name,
      phone: phone,
      city: String(rowData[COL.CITY] || '').trim() || null,
      capital: String(rowData[COL.CAPITAL] || '').trim() || null,
      capital_numeric: capitalNumeric,
      notes: String(rowData[COL.FEEDBACK] || '').trim() || null,
      source: TAB_CONFIG[tabName].source,
      lead_type: TAB_CONFIG[tabName].leadType,
      status: status || 'fresh_enquiry',
      sheet_row_number: idx + 2,
      sheet_tab: tabName,
      sheet_color: bgColor,
      synced_from_sheet: true,
      last_sheet_sync_at: new Date().toISOString(),
    };
    
    if (currentDateContext) {
      leadData.created_at = currentDateContext;
      leadData.enquiry_date = currentDateContext;
    }
    
    if (ASSIGNED_USER_ID) {
      leadData.assigned_to = ASSIGNED_USER_ID;
    }
    
    try {
      upsertLead(leadData);
      synced++;
    } catch (err) {
      errors++;
      console.error('Row ' + (idx + 2) + ' error:', err);
    }
    
    // Rate limiting
    Utilities.sleep(100);
  });
  
  ui.alert(
    'Sync Complete! ✅',
    '✅ Synced: ' + synced + '\\n⏭️ Skipped: ' + skipped + '\\n❌ Errors: ' + errors,
    ui.ButtonSet.OK
  );
}

/**
 * Pull latest data from SalesOS → update sheet
 */
function pullFromSalesOS() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const tabName = sheet.getName();
  
  if (!TAB_CONFIG[tabName]) {
    SpreadsheetApp.getUi().alert('This tab is not configured for sync.');
    return;
  }
  
  try {
    // Fetch leads from Supabase for this tab's lead type
    const leadType = TAB_CONFIG[tabName].leadType;
    const url = SUPABASE_URL + '/rest/v1/leads?lead_type=eq.' + leadType + '&order=created_at.desc&limit=500';
    
    const response = UrlFetchApp.fetch(url, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
      },
      muteHttpExceptions: true,
    });
    
    if (response.getResponseCode() !== 200) {
      throw new Error('Supabase returned ' + response.getResponseCode());
    }
    
    const leads = JSON.parse(response.getContentText());
    
    // Build a phone → row mapping for existing sheet data
    const lastRow = sheet.getLastRow();
    const existingPhones = {};
    if (lastRow >= 2) {
      const phones = sheet.getRange(2, COL.PHONE + 1, lastRow - 1, 1).getValues();
      phones.forEach(function(p, i) {
        const norm = normalizePhone(String(p[0] || ''));
        if (norm) existingPhones[norm] = i + 2; // row number
      });
    }
    
    let updated = 0, added = 0;
    
    leads.forEach(function(lead) {
      const phone = normalizePhone(lead.phone);
      if (!phone) return;
      
      if (existingPhones[phone]) {
        // Update existing row
        const row = existingPhones[phone];
        const range = sheet.getRange(row, 1, 1, 6);
        range.setValues([[
          lead.follow_up_note || lead.next_step || '',
          lead.name || '',
          'p:' + lead.phone,
          lead.city || '',
          lead.capital || '',
          lead.notes || '',
        ]]);
        
        // Set color based on status
        const color = statusToColor(lead.status);
        if (color) {
          sheet.getRange(row, 1, 1, 6).setBackground(color);
        }
        
        updated++;
      }
      // Don't add new rows to avoid disrupting the sheet structure
    });
    
    SpreadsheetApp.getUi().alert(
      'Pull Complete! ⬇️',
      '🔄 Updated: ' + updated + ' rows\\n📊 Total leads in SalesOS: ' + leads.length,
      SpreadsheetApp.getUi().ButtonSet.OK
    );
    
  } catch (err) {
    SpreadsheetApp.getUi().alert('Error: ' + err.message);
  }
}

/**
 * Show sync status
 */
function showSyncStatus() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: Inter, sans-serif; padding: 16px;">' +
    '<h3>⚡ SalesOS Sync Status</h3>' +
    '<p><strong>Supabase URL:</strong> ' + (SUPABASE_URL ? '✅ Configured' : '❌ Not set') + '</p>' +
    '<p><strong>API Key:</strong> ' + (SUPABASE_KEY ? '✅ Configured' : '❌ Not set') + '</p>' +
    '<p><strong>Last check:</strong> ' + new Date().toLocaleString() + '</p>' +
    '<hr>' +
    '<p style="font-size: 11px; color: #666;">The onEdit trigger syncs individual row changes automatically.</p>' +
    '</div>'
  ).setTitle('SalesOS Sync Status').setWidth(350).setHeight(200);
  SpreadsheetApp.getUi().showSidebar(html);
}

function showConfig() {
  const html = HtmlService.createHtmlOutput(
    '<div style="font-family: Inter, sans-serif; padding: 16px;">' +
    '<h3>⚙️ SalesOS Configuration</h3>' +
    '<p><strong>Spreadsheet:</strong> ' + SpreadsheetApp.getActiveSpreadsheet().getName() + '</p>' +
    '<p><strong>Configured Tabs:</strong> ' + Object.keys(TAB_CONFIG).join(', ') + '</p>' +
    '<p><strong>Assigned User ID:</strong> ' + (ASSIGNED_USER_ID || 'Auto (self)') + '</p>' +
    '<hr>' +
    '<p style="font-size: 11px; color: #666;">To change settings, edit the script variables at the top of Code.gs</p>' +
    '</div>'
  ).setTitle('Configuration').setWidth(350).setHeight(200);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ═══════════════════════════════════════════════════════
// SUPABASE API HELPERS
// ═══════════════════════════════════════════════════════

/**
 * Upsert a lead to Supabase. If phone exists, update; otherwise insert.
 */
function upsertLead(leadData) {
  // First check if lead exists by phone
  const checkUrl = SUPABASE_URL + '/rest/v1/leads?phone=eq.' + encodeURIComponent(leadData.phone) + '&limit=1';
  
  const checkResponse = UrlFetchApp.fetch(checkUrl, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
    muteHttpExceptions: true,
  });
  
  const existing = JSON.parse(checkResponse.getContentText());
  
  if (existing && existing.length > 0) {
    // UPDATE existing lead
    const updateUrl = SUPABASE_URL + '/rest/v1/leads?id=eq.' + existing[0].id;
    
    // Don't overwrite certain fields
    delete leadData.assigned_to; // Don't change assignment on sync
    delete leadData.source;      // Keep original source
    
    UrlFetchApp.fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      payload: JSON.stringify(leadData),
      muteHttpExceptions: true,
    });
  } else {
    // INSERT new lead
    const insertUrl = SUPABASE_URL + '/rest/v1/leads';
    
    UrlFetchApp.fetch(insertUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      payload: JSON.stringify(leadData),
      muteHttpExceptions: true,
    });
  }
}

// ═══════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════

function normalizePhone(raw) {
  if (!raw) return '';
  var phone = String(raw).trim();
  phone = phone.replace(/^p:\\s*/i, '');
  phone = phone.replace(/[^\\d]/g, '');
  if (phone.indexOf('91') === 0 && phone.length > 10) {
    phone = phone.substring(phone.length - 10);
  }
  if (phone.indexOf('0') === 0 && phone.length === 11) {
    phone = phone.substring(1);
  }
  if (phone.length > 10) {
    phone = phone.substring(phone.length - 10);
  }
  return phone;
}

function mapColorToStatus(bgColor) {
  if (!bgColor || bgColor === '#ffffff' || bgColor === '#000000') return null;
  
  // Convert hex to RGB
  var r = parseInt(bgColor.substring(1, 3), 16);
  var g = parseInt(bgColor.substring(3, 5), 16);
  var b = parseInt(bgColor.substring(5, 7), 16);
  
  // Green detection (R < 180, G > 150, B < 180)
  if (g > 150 && g > r && g > b && r < 200) return 'discovery';
  
  // Sky blue (R < 200, G > 180, B > 220)
  if (b > 200 && g > 150 && r < 200) return 'converted';
  
  // Purple (R > 150, G < 180, B > 180)
  if (r > 130 && b > 170 && g < 180 && r < 220) return 'demo_done';
  
  // Grey (R ≈ G ≈ B, all between 100-230)
  if (Math.abs(r - g) < 30 && Math.abs(g - b) < 30 && r > 100 && r < 240) return 'lost';
  
  return null;
}

function statusToColor(status) {
  var map = {
    'discovery': '#93c47d',
    'demo_scheduled': '#93c47d',
    'demo_done': '#b4a7d6',
    'negotiation': '#b4a7d6',
    'converted': '#a4c2f4',
    'lost': '#cccccc',
  };
  return map[status] || null;
}

function parseCapitalToNumber(raw) {
  if (!raw) return 0;
  var str = String(raw).trim().toLowerCase();
  
  var lakhMatch = str.match(/([\\d.]+)\\s*(?:lakh|lac|l)/);
  if (lakhMatch) return Math.round(parseFloat(lakhMatch[1]) * 100000);
  
  var kMatch = str.match(/([\\d.]+)\\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  
  var plainMatch = str.match(/([\\d,]+)/);
  if (plainMatch) return parseInt(plainMatch[1].replace(/,/g, ''), 10) || 0;
  
  return 0;
}

function isDateRow(rowData) {
  var nonEmpty = 0;
  var hasDate = false;
  
  rowData.forEach(function(cell) {
    if (!cell) return;
    if (cell instanceof Date) {
      nonEmpty++;
      hasDate = true;
      return;
    }
    var val = String(cell).trim();
    if (val) {
      nonEmpty++;
      var datePattern = /^\\d{1,2}[-\\/.]+\\d{1,2}[-\\/.]+\\d{2,4}$/;
      var datePattern2 = /^\\d{2,4}[-\\/.]+\\d{1,2}[-\\/.]+\\d{1,2}$/;
      if (datePattern.test(val) || datePattern2.test(val)) {
        hasDate = true;
      } else if (val.indexOf('T') !== -1 && !isNaN(Date.parse(val))) {
        hasDate = true;
      }
    }
  });
  
  return hasDate && nonEmpty <= 2;
}

function extractDateFromRow(rowData) {
  for (var i = 0; i < rowData.length; i++) {
    var cell = rowData[i];
    if (!cell) continue;
    if (cell instanceof Date) {
      return cell.toISOString();
    }
    var val = String(cell).trim();
    if (!val) continue;

    if (val.indexOf('T') !== -1 && !isNaN(Date.parse(val))) {
      return new Date(val).toISOString();
    }

    var match = val.match(/^(\\d{1,2})[-\\/.]+(\\d{1,2})[-\\/.]+(\\d{2,4})$/);
    if (match) {
      var d = match[1];
      var m = match[2];
      var y = match[3];
      var year = y.length === 2 ? '20' + y : y;
      if (d.length === 1) d = '0' + d;
      if (m.length === 1) m = '0' + m;
      return year + '-' + m + '-' + d + 'T00:00:00.000Z';
    }

    var matchISO = val.match(/^(\\d{2,4})[-\\/.]+(\\d{1,2})[-\\/.]+(\\d{1,2})$/);
    if (matchISO) {
      var y = matchISO[1];
      var m = matchISO[2];
      var d = matchISO[3];
      var year = y.length === 2 ? '20' + y : y;
      if (d.length === 1) d = '0' + d;
      if (m.length === 1) m = '0' + m;
      return year + '-' + m + '-' + d + 'T00:00:00.000Z';
    }
  }
  return null;
}

function findDateHeaderAbove(sheet, startRow) {
  for (var r = startRow - 1; r >= 2; r--) {
    var rowData = sheet.getRange(r, 1, 1, 6).getValues()[0];
    if (isDateRow(rowData)) {
      var dateStr = extractDateFromRow(rowData);
      if (dateStr) return dateStr;
    }
  }
  return null;
}

// ═══════════════════════════════════════════════════════
// TIMED TRIGGER (Auto-pull from SalesOS every 5 min)
// To enable: Go to Triggers → Add Trigger → pullUpdates → Time-driven → Minutes → 5
// ═══════════════════════════════════════════════════════

function pullUpdates() {
  // Silently pulls latest changes from SalesOS and updates sheet colors
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  Object.keys(TAB_CONFIG).forEach(function(tabName) {
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) return;
    
    var leadType = TAB_CONFIG[tabName].leadType;
    var url = SUPABASE_URL + '/rest/v1/leads?lead_type=eq.' + leadType + 
              '&last_sheet_sync_at=not.is.null&order=updated_at.desc&limit=100';
    
    try {
      var response = UrlFetchApp.fetch(url, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + SUPABASE_KEY,
        },
        muteHttpExceptions: true,
      });
      
      if (response.getResponseCode() !== 200) return;
      
      var leads = JSON.parse(response.getContentText());
      
      // Build phone → row mapping
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) return;
      
      var phones = sheet.getRange(2, COL.PHONE + 1, lastRow - 1, 1).getValues();
      var phoneToRow = {};
      phones.forEach(function(p, i) {
        var norm = normalizePhone(String(p[0] || ''));
        if (norm) phoneToRow[norm] = i + 2;
      });
      
      // Update colors and feedback for changed leads
      leads.forEach(function(lead) {
        var phone = normalizePhone(lead.phone);
        var row = phoneToRow[phone];
        if (!row) return;
        
        // Update feedback column
        if (lead.notes) {
          sheet.getRange(row, COL.FEEDBACK + 1).setValue(lead.notes);
        }
        
        // Update row color based on status
        var color = statusToColor(lead.status);
        if (color) {
          sheet.getRange(row, 1, 1, 6).setBackground(color);
        }
      });
      
    } catch (err) {
      console.error('pullUpdates error for ' + tabName + ':', err);
    }
  });
}

// ═══════════════════════════════════════════════════════
// WEB API ENDPOINTS (doGet & doPost)
// ═══════════════════════════════════════════════════════

function doGet(e) {
  try {
    var action = e.parameter.action;
    var tabId = e.parameter.tab || 'web_lead';
    var tabName = tabId === 'web_lead' ? 'web lead' : tabId;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found: ' + tabName }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return ContentService.createTextOutput(JSON.stringify({ rows: [], colors: [] }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    var limit = e.parameter.limit ? parseInt(e.parameter.limit, 10) : null;
    var numRows = limit ? Math.min(limit, lastRow - 1) : lastRow - 1;
    
    var rows = sheet.getRange(2, 1, numRows, 6).getValues();
    var backgrounds = sheet.getRange(2, 1, numRows, 1).getBackgrounds();
    
    var colors = backgrounds.map(function(bg, idx) {
      return {
        row: idx + 2,
        bgColor: bg[0]
      };
    });
    
    return ContentService.createTextOutput(JSON.stringify({ rows: rows, colors: colors }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    if (action === 'update') {
      var tabName = body.tab || 'web lead';
      var rowNumber = parseInt(body.rowNumber, 10);
      var data = body.data;
      
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        return ContentService.createTextOutput(JSON.stringify({ error: 'Sheet not found' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
      
      if (data.name) sheet.getRange(rowNumber, COL.NAME + 1).setValue(data.name);
      if (data.phone) sheet.getRange(rowNumber, COL.PHONE + 1).setValue('p:' + data.phone);
      if (data.city) sheet.getRange(rowNumber, COL.CITY + 1).setValue(data.city);
      if (data.capital) sheet.getRange(rowNumber, COL.CAPITAL + 1).setValue(data.capital);
      if (data.notes) sheet.getRange(rowNumber, COL.FEEDBACK + 1).setValue(data.notes);
      
      var color = statusToColor(data.status);
      if (color) {
        sheet.getRange(rowNumber, 1, 1, 6).setBackground(color);
      }
      
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`;
}

/**
 * Generate a simplified setup guide as HTML
 */
export function generateSetupGuide() {
  return [
    {
      step: 1,
      title: 'Open Your Google Sheet',
      desc: 'Go to your sales Google Sheet and open the one with "Web Lead" and "Follow up" tabs.',
      icon: '📊',
    },
    {
      step: 2,
      title: 'Open Apps Script Editor',
      desc: 'Click Extensions → Apps Script. This opens the code editor.',
      icon: '⚙️',
    },
    {
      step: 3,
      title: 'Paste the Script',
      desc: 'Delete any existing code, then paste the SalesOS sync script. Click Save (💾).',
      icon: '📋',
    },
    {
      step: 4,
      title: 'Set Up Trigger',
      desc: 'Click the clock icon (⏰ Triggers) → Add Trigger → Select "onEdit" → Event type: "On edit" → Save.',
      icon: '⏰',
    },
    {
      step: 5,
      title: 'Authorize',
      desc: 'Google will ask for permissions. Click "Advanced" → "Go to SalesOS Sync" → "Allow".',
      icon: '🔐',
    },
    {
      step: 6,
      title: 'Initial Sync',
      desc: 'Reload the sheet. You\'ll see a "⚡ SalesOS" menu. Click "Sync All to SalesOS" for the first full sync.',
      icon: '🚀',
    },
  ];
}
