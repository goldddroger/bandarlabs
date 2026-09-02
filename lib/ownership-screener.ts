export type OwnershipMovement = "new" | "increased" | "stable" | "decreased" | "exited";

export type OwnershipSnapshotRow = {
  id: number;
  ticker: string;
  disclosure_threshold: 1 | 5;
  issuer_name: string;
  investor_name: string;
  account_holder: string | null;
  classification: string | null;
  local_foreign: string | null;
  nationality: string | null;
  domicile: string | null;
  shares: number;
  percentage: number | null;
  report_date: string;
};

export type OwnershipMovementRow = OwnershipSnapshotRow & {
  row_key: string;
  previous_shares: number | null;
  previous_percentage: number | null;
  share_change: number | null;
  percentage_change: number | null;
  movement: OwnershipMovement;
};

function identity(row: Pick<OwnershipSnapshotRow, "ticker" | "investor_name" | "account_holder">) {
  return [row.ticker, row.investor_name, row.account_holder ?? ""]
    .map((value) => value.trim().toUpperCase())
    .join("|");
}

export function buildOwnershipMovements(
  currentRows: OwnershipSnapshotRow[],
  previousRows: OwnershipSnapshotRow[],
  currentDate: string,
) {
  const previousMap = new Map(previousRows.map((row) => [identity(row), row]));
  const currentKeys = new Set<string>();
  const movements: OwnershipMovementRow[] = currentRows.map((row) => {
    const rowKey = identity(row);
    currentKeys.add(rowKey);
    const previous = previousMap.get(rowKey);
    const shares = Number(row.shares || 0);
    const percentage = Number(row.percentage || 0);
    const previousShares = previous ? Number(previous.shares || 0) : null;
    const previousPercentage = previous ? Number(previous.percentage || 0) : null;
    const shareChange = previousShares === null ? null : shares - previousShares;
    const movement: OwnershipMovement = previousShares === null
      ? "new"
      : shareChange === 0
        ? "stable"
        : Number(shareChange) > 0
          ? "increased"
          : "decreased";
    return {
      ...row,
      row_key: rowKey,
      shares,
      percentage,
      previous_shares: previousShares,
      previous_percentage: previousPercentage,
      share_change: shareChange,
      percentage_change: previousPercentage === null ? null : percentage - previousPercentage,
      movement,
    };
  });

  previousRows.forEach((row) => {
    const rowKey = identity(row);
    if (currentKeys.has(rowKey)) return;
    const previousShares = Number(row.shares || 0);
    const previousPercentage = Number(row.percentage || 0);
    movements.push({
      ...row,
      id: -Math.abs(row.id),
      row_key: rowKey,
      shares: 0,
      percentage: 0,
      report_date: currentDate,
      previous_shares: previousShares,
      previous_percentage: previousPercentage,
      share_change: -previousShares,
      percentage_change: -previousPercentage,
      movement: "exited",
    });
  });

  return movements;
}

export function emptyMovementCounts() {
  return { new: 0, increased: 0, stable: 0, decreased: 0, exited: 0 } satisfies Record<OwnershipMovement, number>;
}
