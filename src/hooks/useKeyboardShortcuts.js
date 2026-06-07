/**
 * GLOBAL KEYBOARD SHORTCUTS HOOK
 * Power-user productivity: navigate, search, and act without a mouse
 */
import { useEffect } from 'react';
import useUIStore from '../stores/useUIStore';
import useAppStore from '../stores/useAppStore';

export default function useKeyboardShortcuts() {
  useEffect(() => {
    let gPressed = false;
    let gTimeout = null;

    const handler = (e) => {
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) ||
                      document.activeElement?.isContentEditable;
      const hasModifier = e.metaKey || e.ctrlKey;

      // ── ESCAPE (Close Modals & Panels) ──
      if (e.key === 'Escape') {
        const ui = useUIStore.getState();
        const app = useAppStore.getState();
        if (ui.isShortcutsOverlayOpen) { ui.closeShortcutsOverlay(); return; }
        if (ui.isCommandPaletteOpen) { ui.closeCommandPalette(); return; }
        if (app.copilotOpen) { app.closeCopilot(); return; }
        if (ui.isLeadDetailOpen) { ui.closeLeadDetail(); return; }
        if (ui.isAddLeadOpen) { ui.closeAddLead(); return; }
        if (ui.isImportOpen) { ui.closeImport(); return; }
        return;
      }

      // ── MODIFIER SHORTCUTS (Always active) ──
      
      // ⌘K / Ctrl+K — Command Palette
      if (hasModifier && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        useUIStore.getState().toggleCommandPalette();
        return;
      }

      // ⌘J / Ctrl+J — Toggle Copilot
      if (hasModifier && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const { copilotOpen, openCopilot, closeCopilot } = useAppStore.getState();
        copilotOpen ? closeCopilot() : openCopilot();
        return;
      }

      // ⌘. / Ctrl+. — Quick Add Lead
      if (hasModifier && e.key === '.') {
        e.preventDefault();
        useUIStore.getState().openAddLead();
        return;
      }

      // Don't process other shortcuts if user is typing in an input
      if (isInput) return;

      const ui = useUIStore.getState();
      const { focusedLeadId } = ui;

      // ── GO-TO COMMAND COMBOS (g + key) ──
      if (gPressed) {
        gPressed = false;
        if (gTimeout) clearTimeout(gTimeout);

        const pageMap = {
          'h': 'home',
          'a': 'action-hub',
          'c': 'clients',
          'r': 'revenue',
          'l': 'leaderboard',
          'i': 'intelligence',
          'f': 'focus',
        };
        const targetPage = pageMap[e.key.toLowerCase()];
        if (targetPage) {
          e.preventDefault();
          ui.setActivePage(targetPage);
          return;
        }
      }

      if (e.key.toLowerCase() === 'g' && !hasModifier) {
        gPressed = true;
        gTimeout = setTimeout(() => {
          gPressed = false;
        }, 1000);
        return;
      }

      // ── LIST NAVIGATION (j / k) ──
      if ((e.key.toLowerCase() === 'j' || e.key.toLowerCase() === 'k') && !hasModifier) {
        const elements = Array.from(document.querySelectorAll('[data-keyboard-nav="lead"]'));
        if (elements.length > 0) {
          e.preventDefault();
          const currentIndex = elements.findIndex(el => el.getAttribute('data-lead-id') === focusedLeadId);
          let nextIndex = 0;
          if (e.key.toLowerCase() === 'j') {
            nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % elements.length;
          } else {
            nextIndex = currentIndex === -1 ? elements.length - 1 : (currentIndex - 1 + elements.length) % elements.length;
          }
          const targetEl = elements[nextIndex];
          const targetId = targetEl.getAttribute('data-lead-id');
          ui.setFocusedLeadId(targetId);
          targetEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
          return;
        }
      }

      // ── LIST SELECTION & ACTIONS ──

      // Enter — Open Details for focused lead
      if (e.key === 'Enter' && !hasModifier && focusedLeadId) {
        e.preventDefault();
        ui.openLeadDetail(focusedLeadId);
        return;
      }

      // c — Create new lead
      if (e.key.toLowerCase() === 'c' && !hasModifier) {
        e.preventDefault();
        ui.openAddLead();
        return;
      }

      // / — Focus Search Input on the page
      if (e.key === '/' && !hasModifier) {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Search"]') ||
                            document.querySelector('input[type="text"]');
        if (searchInput) {
          searchInput.focus();
          // Clear any current text selection and put cursor at the end
          const val = searchInput.value;
          searchInput.value = '';
          searchInput.value = val;
        }
        return;
      }

      // ? — Keyboard Shortcuts Overlay
      if (e.key === '?' && !hasModifier) {
        e.preventDefault();
        ui.toggleShortcutsOverlay();
        return;
      }

      // ── CONTEXT-AWARE LEAD HOTKEYS (Detail Panel Open) ──
      if (ui.isLeadDetailOpen) {
        // e — Edit Lead Profile
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          const editBtn = document.querySelector('button[aria-label="Edit Profile"]') || 
                          Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Edit' || b.textContent.trim() === 'Cancel');
          if (editBtn) editBtn.click();
          return;
        }
        // n — Focus Notes
        if (e.key.toLowerCase() === 'n') {
          e.preventDefault();
          const notesInput = document.querySelector('input[placeholder="Type note & press Enter..."]');
          if (notesInput) notesInput.focus();
          return;
        }
        // s — Schedule / Reschedule
        if (e.key.toLowerCase() === 's') {
          e.preventDefault();
          const rescheduleBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Reschedule'));
          if (rescheduleBtn) rescheduleBtn.click();
          return;
        }
        // p — Record Payment
        if (e.key.toLowerCase() === 'p') {
          e.preventDefault();
          const payBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Record Payment'));
          if (payBtn) payBtn.click();
          return;
        }
      } else if (focusedLeadId) {
        // e — Open and focus details if not already open
        if (e.key.toLowerCase() === 'e') {
          e.preventDefault();
          ui.openLeadDetail(focusedLeadId);
          return;
        }
      }

      // Number keys 1-7 — Legacy page navigation (still supported)
      const pageMap = {
        '1': 'home',
        '2': 'action-hub',
        '3': 'clients',
        '4': 'revenue',
        '5': 'leaderboard',
        '6': 'intelligence',
        '7': 'focus',
      };
      if (pageMap[e.key] && !hasModifier) {
        e.preventDefault();
        ui.setActivePage(pageMap[e.key]);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, []);
}
