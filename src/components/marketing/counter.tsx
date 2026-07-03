"use client";

import { useEffect, useRef, useState } from "react";

/** Animated stat counter — counts up once when scrolled into view. */
export function Counter({ to, suffix = "", label }: { to: number; suffix?: string; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduce) return setValue(to);
        const t0 = performance.now();
        const dur = 1200;
        const tick = (t: number) => {
          const p = Math.min(1, (t - t0) / dur);
          setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [to]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-3xl font-extrabold tracking-tight text-brand-900 dark:text-white sm:text-4xl">
        {value.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}
