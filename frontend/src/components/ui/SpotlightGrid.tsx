import { useEffect, useRef } from 'react';

export function SpotlightGrid() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let currentX = targetX;
    let currentY = targetY;
    let animId: number;

    const handlePointerMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
    };

    const updatePosition = () => {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      if (gridRef.current) {
        gridRef.current.style.setProperty('--mouse-x', `${currentX.toFixed(1)}px`);
        gridRef.current.style.setProperty('--mouse-y', `${currentY.toFixed(1)}px`);
      }
      animId = requestAnimationFrame(updatePosition);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    animId = requestAnimationFrame(updatePosition);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div
      ref={gridRef}
      className="fixed inset-0 pointer-events-none z-0 spotlight-grid opacity-80 transition-opacity duration-700"
      aria-hidden="true"
    />
  );
}
