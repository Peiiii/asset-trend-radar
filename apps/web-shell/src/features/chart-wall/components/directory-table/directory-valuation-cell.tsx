import type { AssetDirectoryItem } from "@gold-insights/market-domain";
import { getValuationDisplay } from "../../utils/valuation-format.utils";
import { getDirectoryActiveSortCellClassName } from "./directory-return-pill";
import "./directory-valuation-cell.css";

type DirectoryValuationCellProps = {
  item: AssetDirectoryItem;
  active: boolean;
};

export function DirectoryValuationCell({ item, active }: DirectoryValuationCellProps): JSX.Element {
  const display = getValuationDisplay(item.valuation, item.currency, { assetType: item.assetType });

  return (
    <td className={getDirectoryActiveSortCellClassName(active)}>
      <div className={`directory-valuation-cell directory-valuation-cell--${display.status}`} title={display.title} aria-label={`${display.statusLabel}: ${display.label} ${display.detail}`}>
        <span className="directory-valuation-cell__main">
          <strong>{display.label}</strong>
          {display.hintLabel && <em>{display.hintLabel}</em>}
        </span>
        <small>{[display.detail, display.rankLabel].filter(Boolean).join(" / ")}</small>
      </div>
    </td>
  );
}
