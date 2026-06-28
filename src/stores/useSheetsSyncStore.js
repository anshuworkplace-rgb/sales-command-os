/**
 * GOOGLE SHEETS SYNC STORE
 * Zustand store managing bi-directional sync state between 
 * Google Sheets and Supabase.
 * 
 * Architecture:
 *   Google Apps Script (in-sheet) → Supabase REST API → Realtime → Frontend
 *   Frontend → Supabase → Apps Script periodic pull → Sheet update
 */
import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { 
  normalizePhone, parseFullSheet, diffAndSync, SPREADSHEET_ID, SHEET_TABS 
} from '../services/sheetsSync';
import useLeadStore from './useLeadStore';
import useUserStore from './useUserStore';


const useSheetsSyncStore = create((set, get) => ({
  // ── CONFIG ──
  spreadsheetId: SPREADSHEET_ID,
  sheetTabs: SHEET_TABS,
  syncEnabled: true,
  appsScriptUrl: localStorage.getItem('sales_os_apps_script_url') || '', // User sets this after deploying the Apps Script

  // ── SYNC STATE ──
  syncStatus: 'idle',      // 'idle' | 'syncing' | 'success' | 'error'
  lastSyncAt: null,
  lastSyncResult: null,    // { inserted, updated, unchanged, errors }
  syncLog: [],             // Array of { timestamp, action, count, status }
  errorMessage: null,

  // ── SHEET DATA PREVIEW ──
  previewData: null,       // { webLead: [...], followUp: [...] } — cached sheet data
  isLoadingPreview: false,

  // ── ACTIONS ──

  /**
   * Set the Apps Script Web App URL
   */
  setAppsScriptUrl: (url) => {
    localStorage.setItem('sales_os_apps_script_url', url);
    set({ appsScriptUrl: url });
  },

  /**
   * Toggle sync on/off
   */
  toggleSync: () => set(s => ({ syncEnabled: !s.syncEnabled })),

  /**
   * Log a sync event
   */
  addSyncLog: (entry) => set(s => ({
    syncLog: [
      { timestamp: new Date().toISOString(), ...entry },
      ...s.syncLog
    ].slice(0, 50)
  })),

  /**
   * Full sync: Pull sheet data via Apps Script Web App → Parse → Upsert to Supabase
   */
  triggerSync: async (tabFilter = null) => {
    const { appsScriptUrl, syncEnabled } = get();
    if (!syncEnabled) return;

    set({ syncStatus: 'syncing', errorMessage: null });

    try {
      const tabsToSync = tabFilter 
        ? SHEET_TABS.filter(t => t.id === tabFilter)
        : SHEET_TABS;

      let totalInserted = 0, totalUpdated = 0, totalUnchanged = 0;
      const errors = [];

      for (const tab of tabsToSync) {
        try {
          // Fetch sheet data via Apps Script Web App
          let sheetData;
          
          if (!appsScriptUrl || !appsScriptUrl.includes('script.google.com')) {
            throw new Error('Apps Script URL is missing or invalid. Please save it in the Setup Guide.');
          }

          // Clean up URL in case there are trailing slashes or query params
          const baseUrl = appsScriptUrl.split('?')[0].replace(/\/edit.*$/, '/exec');
          const fetchUrl = `${baseUrl}?action=read&tab=${encodeURIComponent(tab.id)}`;

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

          try {
            const res = await fetch(fetchUrl, {
              method: 'GET',
              redirect: 'follow', // Apps Script requires following redirects
              headers: {
                'Accept': 'application/json'
              },
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            sheetData = await res.json();
          } catch (fetchErr) {
            clearTimeout(timeoutId);
            if (fetchErr.name === 'AbortError') {
              throw new Error('Google Sheets sync request timed out (15s). Please check your internet or Google Apps Script Web App.');
            }
            throw fetchErr;
          }
          
          if (sheetData.error) {
            throw new Error(`Apps Script Error: ${sheetData.error}`);
          }

          if (!sheetData || !sheetData.rows) {
            errors.push(`${tab.label}: No data received`);
            continue;
          }

          // Parse sheet rows into lead objects
          const parsedLeads = parseFullSheet(
            sheetData.rows, 
            tab.leadType,
            sheetData.colors || []
          );

          // Get existing leads from Supabase
          const existingLeads = useLeadStore.getState().leads;

          // Diff and sync
          const diff = diffAndSync(parsedLeads, existingLeads);

          // Insert new leads using bulk insert (single DB request)
          const currentUser = useUserStore.getState().currentUserProfile;
          const assignedTo = currentUser ? currentUser.id : null;

          if (diff.toInsert.length > 0) {
            const insertPayloads = diff.toInsert.map(lead => {
              const payload = {
                name: lead.name,
                phone: lead.phone,
                city: lead.city,
                capital: lead.capital,
                capital_numeric: lead.capital_numeric,
                notes: lead.notes,
                source: lead.source,
                lead_type: lead.lead_type,
                status: lead.status,
                sheet_row_number: lead.sheet_row_number,
                sheet_color: lead.sheet_color,
                synced_from_sheet: true,
                last_sheet_sync_at: new Date().toISOString(),
                enquiry_date: lead.enquiry_date,
                broker: lead.broker,
                trading_experience: lead.trading_experience,
                competitor: lead.competitor,
                disposition: lead.disposition,
                objections_logged: lead.objections_logged,
                last_feedback: lead.last_feedback,
                feedback_sentiment: lead.feedback_sentiment,
              };

              if (lead.created_context_date) {
                payload.created_at = lead.created_context_date;
              }

              if (assignedTo) {
                payload.assigned_to = assignedTo;
              }
              return payload;
            });

            try {
              const { error: insertErr } = await supabase
                .from('leads')
                .insert(insertPayloads);
                
              if (insertErr) throw insertErr;
              totalInserted += insertPayloads.length;
            } catch (err) {
              errors.push(`Bulk Insert Error: ${err.message}`);
            }
          }

          // Update existing leads in parallel
          if (diff.toUpdate.length > 0) {
            const updatePromises = diff.toUpdate.map(async ({ id, changes }) => {
              try {
                const { error: updateErr } = await supabase
                  .from('leads')
                  .update({ ...changes, last_sheet_sync_at: new Date().toISOString() })
                  .eq('id', id);
                if (updateErr) throw updateErr;
                totalUpdated++;
              } catch (err) {
                errors.push(`Update ${id}: ${err.message}`);
              }
            });
            await Promise.all(updatePromises);
          }

          totalUnchanged += diff.unchanged.length;
        } catch (tabErr) {
          errors.push(`${tab.label}: ${tabErr.message}`);
        }
      }

      const result = {
        inserted: totalInserted,
        updated: totalUpdated,
        unchanged: totalUnchanged,
        errors: errors.length > 0 ? errors : null,
      };

      set({
        syncStatus: errors.length > 0 && totalInserted === 0 && totalUpdated === 0 ? 'error' : 'success',
        lastSyncAt: new Date(),
        lastSyncResult: result,
        errorMessage: errors.length > 0 ? errors[0] : null,
      });

      get().addSyncLog({
        action: tabFilter ? `sync_${tabFilter}` : 'sync_all',
        count: totalInserted + totalUpdated,
        status: 'success',
        details: result,
      });

      // Refresh lead store
      await useLeadStore.getState().fetchData();

      return result;
    } catch (err) {
      set({
        syncStatus: 'error',
        errorMessage: err.message,
      });
      get().addSyncLog({
        action: 'sync_all',
        count: 0,
        status: 'error',
        details: err.message,
      });
      throw err;
    }
  },

  /**
   * Push OS lead changes back to Google Sheet via Apps Script
   */
  pushToSheet: async (leadId) => {
    const { appsScriptUrl } = get();
    if (!appsScriptUrl || !appsScriptUrl.includes('script.google.com')) return;

    // Clean up URL
    const baseUrl = appsScriptUrl.split('?')[0].replace(/\/edit.*$/, '/exec');

    try {
      const { data: lead } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (!lead || !lead.sheet_row_number) return;

      await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // MUST be text/plain to avoid CORS preflight in Apps Script
        body: JSON.stringify({
          action: 'update',
          tab: 'web lead',
          rowNumber: lead.sheet_row_number,
          data: {
            name: lead.name,
            phone: lead.phone,
            city: lead.city,
            capital: lead.capital,
            notes: lead.notes,
            status: lead.status,
          }
        }),
      });

      get().addSyncLog({
        action: 'push_to_sheet',
        count: 1,
        status: 'success',
        details: `Updated row ${lead.sheet_row_number} for ${lead.name}`,
      });
    } catch (err) {
      console.error('Push to sheet failed:', err);
    }
  },

  /**
   * Quick preview: fetch and show sheet data without syncing
   */
  loadPreview: async (tabId = 'web_lead') => {
    const { appsScriptUrl } = get();
    set({ isLoadingPreview: true });

    try {
      if (!appsScriptUrl) {
        set({ isLoadingPreview: false });
        return null;
      }

      const res = await fetch(`${appsScriptUrl}?action=preview&tab=${tabId}&limit=20`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      set(s => ({
        previewData: { ...s.previewData, [tabId]: data.rows || [] },
        isLoadingPreview: false,
      }));
      return data;
    } catch (err) {
      set({ isLoadingPreview: false });
      return null;
    }
  },

  /**
   * Clear all sync data
   */
  resetSync: () => set({
    syncStatus: 'idle',
    lastSyncAt: null,
    lastSyncResult: null,
    syncLog: [],
    errorMessage: null,
    previewData: null,
  }),
}));

export default useSheetsSyncStore;
