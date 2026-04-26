import { useEffect, useRef } from 'react';
import type { ReactElement } from 'react';

interface Props { active: boolean; }

export default function HackerRain({ active }: Props): ReactElement | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr  = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width  = canvas.clientWidth  * dpr;
      canvas.height = canvas.clientHeight * dpr;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 14 * dpr;
    const cols = Math.floor(canvas.width / fontSize);
    const drops = Array.from<number>({ length: cols }).fill(1);
    const glyphs = 'アイウエオカキクケコサシスセソ0123456789ABCDEF';

    let last = 0;
    const tick = (t: number) => {
      if (t - last > 60) {
        last = t;
        ctx.fillStyle = 'rgba(0,0,0,0.08)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#00ff41';
        ctx.font = `${fontSize}px 'Courier New', monospace`;
        for (let i = 0; i < drops.length; i++) {
          const ch = glyphs[Math.floor(Math.random() * glyphs.length)];
          ctx.fillText(ch, i * fontSize, drops[i] * fontSize);
          if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
          }
          drops[i]++;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  if (!active) return null;
  if (typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return null;
  }
  return <canvas ref={canvasRef} className="terminal__hacker-rain" aria-hidden="true" />;
}
