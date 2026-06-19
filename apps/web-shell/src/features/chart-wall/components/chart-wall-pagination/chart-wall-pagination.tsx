import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button, Select } from "@gold-insights/ui";
import type { ControlOption } from "@gold-insights/ui";
import "./chart-wall-pagination.css";

type ChartWallPaginationProps = {
  page: number;
  pageSize: number;
  totalCount: number;
  currentCount: number;
  pageSizeOptions: ControlOption[];
  onPageChange(page: number): void;
  onPageSizeChange(pageSize: number): void;
};

export function ChartWallPagination({ page, pageSize, totalCount, currentCount, pageSizeOptions, onPageChange, onPageSizeChange }: ChartWallPaginationProps): JSX.Element {
  const totalPages = Math.max(Math.ceil(totalCount / pageSize), 1);
  const fromIndex = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(fromIndex + currentCount - 1, totalCount);

  return (
    <div className="chart-wall-pagination" aria-label="图表墙分页">
      <div className="chart-wall-pagination__range">
        <strong>{fromIndex.toLocaleString("en-US")}-{toIndex.toLocaleString("en-US")}</strong>
        <span>/ {totalCount.toLocaleString("en-US")}</span>
      </div>
      <Select
        id="chart-wall-page-size"
        label="每页"
        value={String(pageSize)}
        options={pageSizeOptions}
        onChange={(value) => onPageSizeChange(parsePageSize(value, pageSize))}
      />
      <div className="chart-wall-pagination__buttons">
        <Button type="button" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={15} aria-hidden="true" />
          上一页
        </Button>
        <span>第 {page.toLocaleString("en-US")} / {totalPages.toLocaleString("en-US")} 页</span>
        <Button type="button" variant="ghost" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          下一页
          <ChevronRight size={15} aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function parsePageSize(value: string, fallback: number): number {
  const numberValue = Number(value);
  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : fallback;
}
