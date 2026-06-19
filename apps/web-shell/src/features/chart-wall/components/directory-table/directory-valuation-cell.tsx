import type { AssetDirectoryItem } from "@gold-insights/market-domain";
import { getValuationDisplay } from "../../utils/valuation-format.utils";
import { ValuationStack } from "../valuation-stack/valuation-stack";
import { getDirectoryActiveSortCellClassName } from "./directory-return-pill";

type DirectoryValuationCellProps = {
  item: AssetDirectoryItem;
  active: boolean;
};

export function DirectoryValuationCell({ item, active }: DirectoryValuationCellProps): JSX.Element {
  const display = getValuationDisplay(item.valuation, item.currency, { assetType: item.assetType });

  return (
    <td className={getDirectoryActiveSortCellClassName(active)}>
      <ValuationStack display={display} showStatusBadge />
    </td>
  );
}
