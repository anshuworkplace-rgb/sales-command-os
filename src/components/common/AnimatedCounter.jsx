import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedCounter — Numbers count up cinematically when they appear.
 */
export default function AnimatedCounter({ value, prefix = '', suffix = '', duration = 1200, className = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const numVal = typeof value === 'number' ? value : parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const isDecimal = String(value).includes('.') || numVal % 1 !== 0;

  useEffect(() => {
    let start = 0;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = ease * numVal;
      setDisplay(current);
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [numVal, duration]);

  const formatted = isDecimal ? display.toFixed(1) : Math.round(display).toLocaleString('en-IN');

  return <span className={className}>{prefix}{formatted}{suffix}</span>;
}
