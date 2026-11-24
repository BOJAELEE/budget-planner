import { useRef, useState, type TouchEvent } from 'react';

export const SWIPE_TRIGGER_PX = 60;
export const SWIPE_LOCK_PX = 14;
export const HORIZONTAL_DOMINANCE_RATIO = 1.4;
export const MAX_VISUAL_OFFSET_PX = 40;

type SwipeDirection = 'prev' | 'next' | null;

type SwipeState = {
  offsetX: number;
  direction: SwipeDirection;
  ready: boolean;
};

type GestureStart = {
  x: number;
  y: number;
  axis: 'pending' | 'horizontal' | 'vertical';
};

const INITIAL_SWIPE_STATE: SwipeState = { offsetX: 0, direction: null, ready: false };

function isSwipeIgnoredTarget(target: EventTarget | null): boolean {
  return target instanceof Element
    && target.closest('input, textarea, select, [contenteditable="true"]') !== null;
}

/** Tracks single-finger horizontal swipes while preserving vertical scrolling and form inputs. */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
}: {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}) {
  const startRef = useRef<GestureStart | null>(null);
  const [swipe, setSwipe] = useState<SwipeState>(INITIAL_SWIPE_STATE);

  const resetSwipe = () => {
    startRef.current = null;
    setSwipe(INITIAL_SWIPE_STATE);
  };

  const onTouchStart = (event: TouchEvent) => {
    if (event.touches.length !== 1 || isSwipeIgnoredTarget(event.target)) {
      resetSwipe();
      return;
    }
    const touch = event.touches[0];
    startRef.current = { x: touch.clientX, y: touch.clientY, axis: 'pending' };
  };

  const onTouchMove = (event: TouchEvent) => {
    const start = startRef.current;
    if (!start) return;
    if (event.touches.length !== 1) {
      resetSwipe();
      return;
    }

    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;

    if (start.axis === 'pending') {
      if (Math.abs(dx) < SWIPE_LOCK_PX && Math.abs(dy) < SWIPE_LOCK_PX) return;
      start.axis = Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO ? 'horizontal' : 'vertical';
    }

    if (start.axis !== 'horizontal') return;

    const offsetX = Math.max(-MAX_VISUAL_OFFSET_PX, Math.min(MAX_VISUAL_OFFSET_PX, Math.round(dx * 0.35)));
    setSwipe({
      offsetX,
      direction: dx > 0 ? 'prev' : 'next',
      ready: Math.abs(dx) >= SWIPE_TRIGGER_PX,
    });
  };

  const onTouchEnd = (event: TouchEvent) => {
    const start = startRef.current;
    resetSwipe();
    if (!start || start.axis === 'vertical') return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) >= SWIPE_TRIGGER_PX && Math.abs(dx) > Math.abs(dy) * HORIZONTAL_DOMINANCE_RATIO) {
      if (dx < 0) onSwipeLeft();
      else onSwipeRight();
    }
  };

  const onTouchCancel = () => {
    resetSwipe();
  };

  return {
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
    swipe,
  };
}
