"use client";

import { useEffect, useState, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

export default function AnimatedNumber({
  value,
  prefix = "",
  suffix = "",
  decimals = 0,
  duration = 2000 // 2 seconds default (smooth slow animation)
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  // We use a ref to track if component is unmounted to prevent memory leaks
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let startTimestamp: number | null = null;
    let animationFrameId: number;
    
    // Ease Out Quint function for super smooth dramatic slow down at the end
    const easeOutQuint = (x: number): number => {
      return 1 - Math.pow(1 - x, 5);
    };

    const step = (timestamp: number) => {
      if (!isMounted.current) return;
      if (!startTimestamp) startTimestamp = timestamp;
      
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = easeOutQuint(progress);
      
      setDisplayValue(easedProgress * value);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      isMounted.current = false;
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [value, duration]);

  return (
    <>{prefix}{displayValue.toFixed(decimals)}{suffix}</>
  );
}
