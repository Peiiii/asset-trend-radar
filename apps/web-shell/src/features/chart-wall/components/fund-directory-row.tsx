import { ExternalLink, Plus, RefreshCcw } from "lucide-react";
import type { FundCatalogPageItem, FundCatalogSortKey } from "@gold-insights/market-domain";
import "./directory-table/directory-active-sort.css";
import { DirectoryReturnPill } from "./directory-table/directory-return-pill";

type FundDirectoryRowProps = {
  item: FundCatalogPageItem;
  importingCode: string | null;
  sort: FundCatalogSortKey;
  onImport(code: string): void;
  onSelectAsset(assetId: string): void;
};

export function FundDirectoryRow({ item, importingCode, sort, onImport, onSelectAsset }: FundDirectoryRowProps): JSX.Element {
  const isImporting = importingCode === item.code;

  return (
    <tr>
      <td className={activeSortCellClassName(sort === "name" || sort === "code" || sort === "relevance")}>
        <strong>{item.name}</strong>
        <small>{item.code}{item.pinyin ? ` / ${item.pinyin}` : ""}</small>
      </td>
      <td>{item.fundType ?? "未分类"}</td>
      <td>
        <span className={item.isImported ? "fund-directory-status fund-directory-status--imported" : "fund-directory-status"}>
          {item.isImported ? "已加入走势池" : "待加入走势池"}
        </span>
      </td>
      <td className={activeSortCellClassName(sort === "latest_nav")}>
        {item.latestNav === null ? (
          <span className="fund-directory-null">暂无快照</span>
        ) : (
          <span className="fund-directory-nav">
            <strong>{item.latestNav.toFixed(4)}</strong>
            <small>{item.latestNavDate ?? "--"}</small>
          </span>
        )}
      </td>
      <FundPercentCell value={item.return1d} active={sort === "return_1d"} />
      <FundPercentCell value={item.return1m} active={sort === "return_1m"} />
      <FundPercentCell value={item.return3m} active={sort === "return_3m"} />
      <FundPercentCell value={item.return6m} active={sort === "return_6m"} />
      <FundPercentCell value={item.return1y} active={sort === "return_1y"} />
      <td className={activeSortCellClassName(sort === "data_point_count")}>
        {item.dataPointCount > 0 ? (
          <span className="fund-directory-source fund-directory-source--local">{item.dataPointCount.toLocaleString("en-US")} 点</span>
        ) : item.metricSource === "catalog_snapshot" ? (
          <span className="fund-directory-source fund-directory-source--snapshot">目录快照</span>
        ) : (
          <span className="fund-directory-source">待拉取</span>
        )}
      </td>
      <td>
        <div className="row-actions">
          <button type="button" disabled={isImporting} onClick={() => onImport(item.code)}>
            {item.isImported ? <RefreshCcw size={13} aria-hidden="true" /> : <Plus size={13} aria-hidden="true" />}
            {isImporting ? "处理中" : item.isImported ? "更新净值" : "加入走势池"}
          </button>
          {item.assetId && (
            <button type="button" onClick={() => onSelectAsset(item.assetId ?? "")}>
              <ExternalLink size={13} aria-hidden="true" />
              查看走势
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

function FundPercentCell({ value, active }: { value: number | null; active: boolean }): JSX.Element {
  return (
    <td className={activeSortCellClassName(active)}>
      <DirectoryReturnPill value={value} />
    </td>
  );
}

function activeSortCellClassName(active: boolean): string | undefined {
  return active ? "directory-table-cell--active-sort" : undefined;
}
