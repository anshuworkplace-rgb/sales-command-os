import { useEffect, useRef } from 'react';

/**
 * AmbientLayer — Renders the aurora background, floating particles,
 * and a mouse-tracking spotlight for a cinematic living UI.
 */
export default function AmbientLayer() {
  const spotRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (spotRef.current) {
        spotRef.current.style.left = e.clientX + 'px';
        spotRef.current.style.top = e.clientY + 'px';
      }
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, []);

  // Generate random particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 20 + 15,
    delay: Math.random() * 15,
    color: ['rgba(0,229,255,0.4)', 'rgba(0,255,178,0.3)', 'rgba(191,107,255,0.3)', 'rgba(255,190,10,0.2)'][Math.floor(Math.random() * 4)],
  }));

  return (
    <>
      {/* Aurora */}
      <div className="aurora-bg" />

      {/* Floating Particles */}
      {particles.map(p => (
        <div key={p.id} className="particle" style={{
          left: `${p.left}%`,
          width: `${p.size}px`,
          height: `${p.size}px`,
          background: `radial-gradient(circle, ${p.color}, transparent 70%)`,
          animationDuration: `${p.duration}s`,
          animationDelay: `${p.delay}s`,
        }} />
      ))}

      {/* Mouse Spotlight */}
      <div ref={spotRef} className="spotlight" />
    </>
  );
}
