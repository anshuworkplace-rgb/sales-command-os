/**
 * SALES OS — Sound Effects System
 * Uses Web Audio API for premium audio feedback
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone(frequency, duration, type = 'sine', volume = 0.15) {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // Audio not available, silently fail
  }
}

// ── Sound Effects ──

export function playCallComplete() {
  // Short rising tone — satisfying completion
  playTone(440, 0.1, 'sine', 0.12);
  setTimeout(() => playTone(554, 0.1, 'sine', 0.12), 100);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.1), 200);
}

export function playStageAdvance() {
  // Whoosh-like rising sweep
  playTone(300, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(400, 0.08, 'sine', 0.1), 60);
  setTimeout(() => playTone(500, 0.08, 'sine', 0.1), 120);
  setTimeout(() => playTone(600, 0.12, 'sine', 0.08), 180);
}

export function playKaChing() {
  // Cash register ka-ching! 💰
  const ctx = getAudioContext();
  try {
    // Bell strike
    playTone(1200, 0.15, 'sine', 0.15);
    setTimeout(() => playTone(1600, 0.12, 'sine', 0.12), 50);
    // Register click
    setTimeout(() => playTone(800, 0.08, 'square', 0.05), 100);
    // Coin jingle
    setTimeout(() => {
      playTone(2000, 0.08, 'sine', 0.08);
      setTimeout(() => playTone(2400, 0.08, 'sine', 0.08), 40);
      setTimeout(() => playTone(2800, 0.1, 'sine', 0.06), 80);
    }, 200);
  } catch (e) {}
}

export function playNotification() {
  // Gentle 2-note notification
  playTone(523, 0.12, 'sine', 0.08);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.08), 120);
}

export function playError() {
  // Low buzz
  playTone(200, 0.2, 'sawtooth', 0.06);
  setTimeout(() => playTone(180, 0.25, 'sawtooth', 0.04), 150);
}

export function playStreak() {
  // Rapid ascending arpeggio for streak
  [440, 554, 659, 880].forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.08, 'sine', 0.1 - i * 0.02), i * 60);
  });
}

export function playDemoBooked() {
  // Calendar scheduling sound — gentle chime
  playTone(659, 0.15, 'sine', 0.1);
  setTimeout(() => playTone(784, 0.15, 'sine', 0.1), 150);
  setTimeout(() => playTone(880, 0.2, 'sine', 0.08), 300);
}

export function playNewLead() {
  // Quick ping — new opportunity
  playTone(880, 0.08, 'sine', 0.1);
  setTimeout(() => playTone(1100, 0.12, 'sine', 0.08), 80);
}

// ── Browser Notifications ──

export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

export function sendBrowserNotification(title, body, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(title, {
      body,
      icon: '/vite.svg',
      badge: '/vite.svg',
      tag: options.tag || 'salesos',
      ...options,
    });
    
    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick();
        notif.close();
      };
    }
    
    // Auto-close after 8 seconds
    setTimeout(() => notif.close(), 8000);
    return notif;
  }
}
