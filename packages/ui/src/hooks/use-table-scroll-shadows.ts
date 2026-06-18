import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export type TableScrollShadowState = {
  tableWrapperRef: RefObject<HTMLDivElement>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  updateScrollEdges(): void;
};

export function useTableScrollShadows(dependencyKey: number): TableScrollShadowState {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [scrollEdges, setScrollEdges] = useState({ canScrollLeft: false, canScrollRight: false });

  const updateScrollEdges = useCallback((): void => {
    const wrapper = tableWrapperRef.current;

    if (!wrapper) {
      return;
    }

    const maxScrollLeft = wrapper.scrollWidth - wrapper.clientWidth;
    setScrollEdges({
      canScrollLeft: wrapper.scrollLeft > 1,
      canScrollRight: wrapper.scrollLeft < maxScrollLeft - 1
    });
  }, []);

  useEffect(() => {
    updateScrollEdges();

    const wrapper = tableWrapperRef.current;
    if (!wrapper) {
      return undefined;
    }

    let animationFrame = 0;
    const scheduleUpdateScrollEdges = (): void => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }

      animationFrame = requestAnimationFrame(() => {
        animationFrame = 0;
        updateScrollEdges();
      });
    };
    const resizeObserver = new ResizeObserver(updateScrollEdges);
    resizeObserver.observe(wrapper);
    wrapper.addEventListener("scroll", scheduleUpdateScrollEdges, { passive: true });
    wrapper.addEventListener("wheel", scheduleUpdateScrollEdges, { passive: true });
    if (wrapper.firstElementChild) {
      resizeObserver.observe(wrapper.firstElementChild);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      resizeObserver.disconnect();
      wrapper.removeEventListener("scroll", scheduleUpdateScrollEdges);
      wrapper.removeEventListener("wheel", scheduleUpdateScrollEdges);
    };
  }, [dependencyKey, updateScrollEdges]);

  return {
    tableWrapperRef,
    canScrollLeft: scrollEdges.canScrollLeft,
    canScrollRight: scrollEdges.canScrollRight,
    updateScrollEdges
  };
}
