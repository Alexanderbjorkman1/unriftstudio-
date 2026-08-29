"use client";

import { useEffect, useRef, useState } from "react";

/** Measures a container so charts can render in real pixels (no stroke distortion). */
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.round(w));
    });
    observer.observe(node);
    setWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/** Rounded "nice" upper bound and tick list for a value axis. */
export function niceScale(max: number, ticks = 5) {
  if (max <= 0) return { max: 100, ticks: [0, 25, 50, 75, 100] };
  const rawStep = max / (ticks - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;
  const top = Math.ceil(max / step) * step;
  return {
    max: top,
    ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step),
  };
}
