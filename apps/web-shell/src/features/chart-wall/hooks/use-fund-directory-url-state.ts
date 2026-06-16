import { useCallback, useMemo } from "react";
import type { FundCatalogImportStatus, FundCatalogSortKey, SortOrder } from "@gold-insights/market-domain";
import type { FundCatalogPageFilters } from "@/shared/types/api.types";

const fundDirectoryLimit = 50;
const supportedFundCatalogSorts: FundCatalogSortKey[] = ["relevance", "code", "name", "latest_nav", "return_1d", "return_1w", "return_1m", "return_3m", "return_6m", "return_1y", "data_point_count"];

export type FundDirectoryUrlState = {
  keyword: string;
  fundType: string;
  status: FundCatalogImportStatus;
  sort: FundCatalogSortKey;
  order: SortOrder;
  page: number;
  limit: number;
  filters: FundCatalogPageFilters;
  setQueryValue(name: string, value: string, fallback: string): void;
  setSortValue(value: FundCatalogSortKey): void;
};

export function useFundDirectoryUrlState(searchParams: URLSearchParams, setSearchParams: (next: URLSearchParams) => void): FundDirectoryUrlState {
  const keyword = getSearchValue(searchParams, "fundKeyword", "");
  const fundType = getSearchValue(searchParams, "fundType", "all");
  const status = getFundCatalogImportStatus(getSearchValue(searchParams, "fundStatus", "all"));
  const sort = getFundCatalogSort(getSearchValue(searchParams, "fundSort", "relevance"));
  const order = getSortOrderValue(getSearchValue(searchParams, "fundOrder", "desc"));
  const page = getPositiveIntegerSearchValue(searchParams, "fundPage", 1);

  const filters = useMemo<FundCatalogPageFilters>(
    () => ({
      keyword,
      fundType,
      status,
      sort,
      order,
      limit: fundDirectoryLimit,
      offset: (page - 1) * fundDirectoryLimit
    }),
    [fundType, keyword, order, page, sort, status]
  );

  const setQueryValue = useCallback((name: string, value: string, fallback: string): void => {
    const next = new URLSearchParams(searchParams);

    if (value === fallback || value.length === 0) {
      next.delete(name);
    } else {
      next.set(name, value);
    }

    if (name !== "fundPage") {
      next.delete("fundPage");
    }

    setSearchParams(next);
  }, [searchParams, setSearchParams]);

  const setSortValue = useCallback((nextSort: FundCatalogSortKey): void => {
    const nextOrder: SortOrder = nextSort === sort ? toggleFundCatalogOrder(order) : defaultFundCatalogOrder(nextSort);
    const next = new URLSearchParams(searchParams);

    if (nextSort === "relevance") {
      next.delete("fundSort");
    } else {
      next.set("fundSort", nextSort);
    }

    if (nextOrder === "desc") {
      next.delete("fundOrder");
    } else {
      next.set("fundOrder", nextOrder);
    }

    next.delete("fundPage");
    setSearchParams(next);
  }, [order, searchParams, setSearchParams, sort]);

  return {
    keyword,
    fundType,
    status,
    sort,
    order,
    page,
    limit: fundDirectoryLimit,
    filters,
    setQueryValue,
    setSortValue
  };
}

function getSearchValue(searchParams: URLSearchParams, name: string, fallback: string): string {
  return searchParams.get(name) ?? fallback;
}

function getPositiveIntegerSearchValue(searchParams: URLSearchParams, name: string, fallback: number): number {
  const value = Number(searchParams.get(name));
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function getFundCatalogImportStatus(value: string): FundCatalogImportStatus {
  return value === "imported" || value === "not_imported" ? value : "all";
}

function getFundCatalogSort(value: string): FundCatalogSortKey {
  return supportedFundCatalogSorts.includes(value as FundCatalogSortKey) ? (value as FundCatalogSortKey) : "relevance";
}

function getSortOrderValue(value: string): SortOrder {
  return value === "asc" ? "asc" : "desc";
}

function toggleFundCatalogOrder(value: SortOrder): SortOrder {
  return value === "desc" ? "asc" : "desc";
}

function defaultFundCatalogOrder(sort: FundCatalogSortKey): SortOrder {
  return sort === "code" || sort === "name" ? "asc" : "desc";
}
