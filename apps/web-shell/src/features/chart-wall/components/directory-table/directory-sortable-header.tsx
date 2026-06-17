import { ArrowDown, ArrowUp } from "lucide-react";
import "./directory-sortable-header.css";

type DirectorySortOrder = "asc" | "desc";

type DirectorySortableHeaderProps<TSort extends string> = {
  label: string;
  sortValue: TSort;
  currentSort: TSort;
  order: DirectorySortOrder;
  onSort(value: TSort): void;
};

export function DirectorySortableHeader<TSort extends string>({ label, sortValue, currentSort, order, onSort }: DirectorySortableHeaderProps<TSort>): JSX.Element {
  const isActive = currentSort === sortValue;

  return (
    <th aria-sort={isActive ? (order === "desc" ? "descending" : "ascending") : "none"}>
      <button type="button" className={isActive ? "directory-sortable-header directory-sortable-header--active" : "directory-sortable-header"} onClick={() => onSort(sortValue)}>
        {label}
        {isActive && (order === "desc" ? <ArrowDown size={12} aria-hidden="true" /> : <ArrowUp size={12} aria-hidden="true" />)}
      </button>
    </th>
  );
}
