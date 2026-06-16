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

    const resizeObserver = new ResizeObserver(updateScrollEdges);
    resizeObserver.observe(wrapper);
    if (wrapper.firstElementChild) {
      resizeObserver.observe(wrapper.firstElementChild);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [dependencyKey, updateScrollEdges]);

  return {
    tableWrapperRef,
    canScrollLeft: scrollEdges.canScrollLeft,
    canScrollRight: scrollEdges.canScrollRight,
    updateScrollEdges
  };
}
