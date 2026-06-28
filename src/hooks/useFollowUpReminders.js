/**
 * useFollowUpReminders — Background hook for proactive follow-up notifications
 * Checks every 60 seconds for overdue follow-ups and SLA violations.
 * Sends browser notifications + updates AI Command Bar.
 */

import { useEffect, useRef, useCallback } from 'react';
import useLeadStore from '../stores/useLeadStore';
import useUserStore from '../stores/useUserStore';
import { checkReminders, getNextBestAction } from '../engines/aiDecisionEngine';

// Track which reminders we've already notified about (to avoid spam)
const notifiedSet = new Set();

function sendBrowserNotification(title, body, onClick) {
  if (!('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notification = new Notification(title, {
      body,
      icon: '⚡',
      badge: '⚡',
      tag: title, // Prevents duplicate notifications
      requireInteraction: true,
    });

    if (onClick) {
      notification.onclick = () => {
        window.focus();
        onClick();
        notification.close();
      };
    }

    // Auto-close after 30s
    setTimeout(() => notification.close(), 30000);
  } catch (e) {
    console.warn('[Reminders] Browser notification failed:', e);
  }
}

function playReminderSound(severity) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (severity === 'critical') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      osc.frequency.setValueAtTime(523, ctx.currentTime);
      osc.frequency.setValueAtTime(659, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Silently fail — audio not critical
  }
}

export default function useFollowUpReminders(onReminder) {
  const intervalRef = useRef(null);
  const { leads } = useLeadStore();
  const { getCurrentUser } = useUserStore();

  const check = useCallback(() => {
    const user = getCurrentUser();
    if (!user || !leads.length) return;

    const reminders = checkReminders(leads, user.id);
    if (!reminders.length) return;

    // Only notify for new reminders (not already notified)
    const newReminders = reminders.filter(r => {
      const key = `${r.lead.id}:${r.type}:${Math.floor(Date.now() / 300000)}`; // 5-min buckets
      if (notifiedSet.has(key)) return false;
      notifiedSet.add(key);
      return true;
    });

    if (newReminders.length === 0) return;

    // Send browser notifications for top 3 most critical
    newReminders.slice(0, 3).forEach(reminder => {
      sendBrowserNotification(
        reminder.title,
        reminder.body,
        () => {
          // Open lead detail on click
          const { openLeadDetail } = require('../stores/useUIStore').default.getState();
          openLeadDetail(reminder.lead.id);
        }
      );
    });

    // Play sound for most critical
    if (newReminders[0]?.severity === 'critical') {
      playReminderSound('critical');
    } else if (newReminders.length > 0) {
      playReminderSound('warning');
    }

    // Callback for AI Command Bar
    if (onReminder) {
      onReminder(reminders);
    }

    // Cleanup old notified entries (prevent memory leak)
    if (notifiedSet.size > 500) {
      const entries = [...notifiedSet];
      entries.slice(0, 250).forEach(e => notifiedSet.delete(e));
    }
  }, [leads, getCurrentUser, onReminder]);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Initial check after 5s (give time for data to load)
    const initialTimer = setTimeout(check, 5000);

    // Check every 60 seconds
    intervalRef.current = setInterval(check, 60000);

    return () => {
      clearTimeout(initialTimer);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [check]);

  // Return current reminders for components to use
  return {
    getActiveReminders: () => {
      const user = getCurrentUser();
      if (!user) return [];
      return checkReminders(leads, user.id);
    },
  };
}
