/**
 * SALES OS — Celebration System
 * Canvas-based confetti + celebration overlays
 */

// ── Confetti Engine (canvas-based, no dependencies) ──

export function launchConfetti(duration = 3000) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:99999;pointer-events:none';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  const particles = [];
  const colors = ['#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#fbbf24', '#34d399'];
  
  // Create particles
  for (let i = 0; i < 150; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      w: 6 + Math.random() * 6,
      h: 4 + Math.random() * 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 6,
      vy: 2 + Math.random() * 4,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      opacity: 1,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    });
  }
  
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      canvas.remove();
      return;
    }
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const fadeStart = duration * 0.7;
    const globalOpacity = elapsed > fadeStart ? 1 - (elapsed - fadeStart) / (duration - fadeStart) : 1;
    
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05; // gravity
      p.vx *= 0.99; // air resistance
      p.rotation += p.rotSpeed;
      
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = globalOpacity * p.opacity;
      ctx.fillStyle = p.color;
      
      if (p.shape === 'rect') {
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.w / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      
      ctx.restore();
    });
    
    requestAnimationFrame(animate);
  }
  
  animate();
}

// ── Revenue Celebration (full experience) ──

export function celebrateConversion(leadName, amount) {
  // 1. Launch confetti
  launchConfetti(4000);
  
  // 2. Show overlay
  const overlay = document.createElement('div');
  overlay.className = 'celebration-overlay';
  overlay.innerHTML = `
    <div style="text-align:center;animation:scale-in 0.5s cubic-bezier(0.22,1,0.36,1)">
      <div style="font-size:64px;margin-bottom:16px;animation:bounce-in 0.6s">💰</div>
      <div style="font-family:'Outfit',sans-serif;font-size:28px;font-weight:800;color:#34d399;letter-spacing:-0.02em;margin-bottom:8px">
        DEAL CLOSED!
      </div>
      <div style="font-family:'Space Grotesk',sans-serif;font-size:40px;font-weight:700;color:#fbbf24;margin-bottom:12px">
        ₹${Number(amount).toLocaleString('en-IN')}
      </div>
      <div style="font-size:16px;color:rgba(255,255,255,0.6);font-weight:500">
        ${leadName || 'New Client'} converted! 🎉
      </div>
      <button onclick="this.closest('.celebration-overlay').remove()" 
        style="margin-top:24px;padding:10px 28px;font-size:14px;font-weight:600;color:#fff;background:linear-gradient(135deg,#10b981,#059669);border:1px solid rgba(16,185,129,0.5);border-radius:10px;cursor:pointer;box-shadow:0 0 20px rgba(16,185,129,0.3)">
        Let's Go! 🚀
      </button>
    </div>
  `;
  document.body.appendChild(overlay);
  
  // Auto-remove after 6 seconds
  setTimeout(() => overlay.remove(), 6000);
}

// ── Streak Celebration (smaller) ──

export function celebrateStreak(count) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;
    padding:12px 24px;border-radius:999px;
    background:linear-gradient(135deg,rgba(251,191,36,0.15),rgba(245,158,11,0.1));
    border:1px solid rgba(251,191,36,0.3);
    box-shadow:0 8px 30px rgba(0,0,0,0.3),0 0 20px rgba(251,191,36,0.1);
    font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;color:#fbbf24;
    display:flex;align-items:center;gap:8px;
    animation:bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
  `;
  toast.innerHTML = `🔥 ${count} Call Streak! Keep it going!`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ── Demo Booked Celebration ──

export function celebrateDemoBooked(leadName) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:9999;
    padding:12px 24px;border-radius:14px;
    background:linear-gradient(135deg,rgba(59,130,246,0.12),rgba(99,102,241,0.08));
    border:1px solid rgba(59,130,246,0.25);
    box-shadow:0 8px 30px rgba(0,0,0,0.3),0 0 20px rgba(59,130,246,0.08);
    font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;color:#60a5fa;
    display:flex;align-items:center;gap:8px;
    animation:bounce-in 0.5s cubic-bezier(0.34,1.56,0.64,1);
  `;
  toast.innerHTML = `📅 Demo scheduled with ${leadName || 'client'}! Key moment! ⭐`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'all 0.3s ease';
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
