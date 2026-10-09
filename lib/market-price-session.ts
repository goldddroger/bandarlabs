export function marketSessionDate(timestamp: number, timeZone = "Asia/Jakarta") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(timestamp * 1000));
}

export function previousSessionClose(closes: readonly (number | null)[], timestamps: readonly number[], currentTimestamp: number, timeZone: string) {
  const currentDate = marketSessionDate(currentTimestamp, timeZone);
  for (let index = Math.min(closes.length, timestamps.length) - 1; index >= 0; index -= 1) {
    const close = closes[index];
    const timestamp = timestamps[index];
    if (typeof close === "number" && Number.isFinite(close) && close > 0 && Number.isFinite(timestamp)
      && marketSessionDate(timestamp, timeZone) < currentDate) return close;
  }
  return undefined;
}
