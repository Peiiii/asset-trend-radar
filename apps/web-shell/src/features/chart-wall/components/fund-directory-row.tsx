import { ExternalLink, Plus, RefreshCcw } from "lucide-react";
import type { FundCatalogPageItem, FundCatalogSortKey } from "@gold-insights/market-domain";
import { DirectoryReturnCell, getDirectoryActiveSortCellClassName } from "./directory-table/directory-return-pill";
import { DirectoryActionButton, DirectoryRowActions } from "./directory-table/directory-row-actions";

type FundDirectoryRowProps = {
  item: FundCatalogPageItem;
  importingCode: string | null;
  sort: FundCatalogSortKey;
  onImport(code: string): void;
  onSelectAsset(assetId: string): void;
};

export function FundDirectoryRow({ item, importingCode, sort, onImport, onSelectAsset }: FundDirectoryRowProps): JSX.Element {
  const isImporting = importingCode === item.code;
  const importActionLabel = isImporting ? `正在处理：${item.name}` : item.isImported ? `更新净值：${item.name}` : `加入走势池：${item.name}`;

  return (
    <tr>
      <td>
        <strong>{item.name}</strong>
        <small>{item.code}{item.pinyin ? ` / ${item.pinyin}` : ""}</small>
      </td>
      <td>{item.fundType ?? "未分类"}</td>
      <td>
        <span className={item.isImported ? "fund-directory-status fund-directory-status--imported" : "fund-directory-status"}>
          {item.isImported ? "已加入走势池" : "待加入走势池"}
        </span>
      </td>
      <td className={getDirectoryActiveSortCellClassName(sort === "latest_nav")}>
        {item.latestNav === null ? (
          <span className="fund-directory-null">暂无快照</span>
        ) : (
          <span className="fund-directory-nav">
            <strong>{item.latestNav.toFixed(4)}</strong>
            <small>{item.latestNavDate ?? "--"}</small>
          </span>
        )}
      </td>
      <DirectoryReturnCell value={item.return1d} active={sort === "return_1d"} />
      <DirectoryReturnCell value={item.return1w} active={sort === "return_1w"} />
      <DirectoryReturnCell value={item.return1m} active={sort === "return_1m"} />
      <DirectoryReturnCell value={item.return3m} active={sort === "return_3m"} />
      <DirectoryReturnCell value={item.return6m} active={sort === "return_6m"} />
      <DirectoryReturnCell value={item.return1y} active={sort === "return_1y"} />
      <td className={getDirectoryActiveSortCellClassName(sort === "data_point_count")}>
        {item.dataPointCount > 0 ? (
          <span className="fund-directory-source fund-directory-source--local">{item.dataPointCount.toLocaleString("en-US")} 点</span>
        ) : item.metricSource === "catalog_snapshot" ? (
          <span className="fund-directory-source fund-directory-source--snapshot">目录快照</span>
        ) : (
          <span className="fund-directory-source">待拉取</span>
        )}
      </td>
      <td>
        <DirectoryRowActions>
          <DirectoryActionButton
            className={!item.isImported ? "directory-action-button--pool" : undefined}
            variant="secondary"
            icon={item.isImported ? <RefreshCcw size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
            label={isImporting ? "处理中" : item.isImported ? "更新净值" : "加入走势池"}
            title={importActionLabel}
            aria-label={importActionLabel}
            disabled={isImporting}
            onClick={() => onImport(item.code)}
          />
          {item.assetId && (
            <DirectoryActionButton label="查看走势" title={`查看走势：${item.name}`} variant="ghost" icon={<ExternalLink size={13} aria-hidden="true" />} onClick={() => onSelectAsset(item.assetId ?? "")} />
          )}
        </DirectoryRowActions>
      </td>
    </tr>
  );
}
