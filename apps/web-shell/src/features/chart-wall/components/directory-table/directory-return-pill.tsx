import "./directory-active-sort.css";
import "./directory-return-pill.css";

type DirectoryReturnPillProps = {
  value: number | null;
};

type DirectoryReturnCellProps = DirectoryReturnPillProps & {
  active: boolean;
};

export function DirectoryReturnPill({ value }: DirectoryReturnPillProps): JSX.Element {
  const tone = value === null ? "neutral" : value >= 0 ? "positive" : "negative";
  const strength = value === null ? "neutral" : Math.abs(value) >= 10 ? "strong" : Math.abs(value) >= 3 ? "medium" : "soft";

  return (
    <span className={`directory-return-pill directory-return-pill--${tone} directory-return-pill--${strength}`}>
      {formatPercent(value)}
    </span>
  );
}

export function DirectoryReturnCell({ value, active }: DirectoryReturnCellProps): JSX.Element {
  return (
    <td className={getDirectoryActiveSortCellClassName(active)}>
      <DirectoryReturnPill value={value} />
    </td>
  );
}

export function getDirectoryActiveSortCellClassName(active: boolean): string | undefined {
  return active ? "directory-table-cell--active-sort" : undefined;
}

function formatPercent(value: number | null): string {
  return value === null ? "暂无快照" : `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}
