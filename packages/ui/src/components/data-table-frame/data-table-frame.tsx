import type { CSSProperties, ReactNode } from "react";
import { useTableScrollShadows } from "../../hooks/use-table-scroll-shadows";
import { cn } from "../../utils/class-name.utils";

type DataTableFrameProps = {
  children: ReactNode;
  rowCount: number;
  className?: string;
  minWidth?: number;
  firstColumnMinWidth?: number;
  lastColumnMinWidth?: number;
};

export function DataTableFrame({ children, rowCount, className, minWidth = 960, firstColumnMinWidth = 240, lastColumnMinWidth = 160 }: DataTableFrameProps): JSX.Element {
  const tableScroll = useTableScrollShadows(rowCount);
  const statefulClassNames = getStatefulClassNames(className, tableScroll.canScrollLeft, tableScroll.canScrollRight);
  const style = {
    "--gi-data-table-min-width": `${minWidth}px`,
    "--gi-data-table-first-column-min-width": `${firstColumnMinWidth}px`,
    "--gi-data-table-last-column-min-width": `${lastColumnMinWidth}px`
  } as CSSProperties;

  return (
    <div
      ref={tableScroll.tableWrapperRef}
      className={cn(
        "gi-data-table-frame",
        tableScroll.canScrollLeft && "gi-data-table-frame--left-shadow",
        tableScroll.canScrollRight && "gi-data-table-frame--right-shadow",
        className,
        ...statefulClassNames
      )}
      style={style}
      onScroll={tableScroll.updateScrollEdges}
    >
      <table>{children}</table>
    </div>
  );
}

function getStatefulClassNames(className: string | undefined, canScrollLeft: boolean, canScrollRight: boolean): string[] {
  if (!className) {
    return [];
  }

  return className
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((name) => [
      canScrollLeft ? `${name}--left-shadow` : "",
      canScrollRight ? `${name}--right-shadow` : ""
    ])
    .filter(Boolean);
}
