import { useMemo, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SpotlightColumn<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  width?: string;
}

export interface SpotlightTableProps<T> {
  data: T[];
  columns: SpotlightColumn<T>[];
  /** Comma-separated keys whose stringified value the search will match against. Defaults to every column. */
  searchKeys?: (keyof T | string)[];
  placeholder?: string;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  rowKey?: (row: T, index: number) => string;
  /** External controlled search; if omitted the component manages its own */
  query?: string;
  onQueryChange?: (q: string) => void;
}

/**
 * Minimal monochrome data table with the "spotlight" effect — rows that don't
 * match the search are dimmed instead of removed. No colors, hairline borders.
 */
export function SpotlightTable<T extends Record<string, any>>({
  data,
  columns,
  searchKeys,
  placeholder = "Search…",
  emptyState,
  onRowClick,
  className,
  rowKey,
  query,
  onQueryChange,
}: SpotlightTableProps<T>) {
  const [internalQ, setInternalQ] = useState("");
  const q = query ?? internalQ;
  const setQ = onQueryChange ?? setInternalQ;
  const lower = q.trim().toLowerCase();

  const keys = (searchKeys ?? columns.map((c) => c.key)) as string[];

  const matches = useMemo(() => {
    if (!lower) return new Set<number>();
    const set = new Set<number>();
    data.forEach((row, i) => {
      const hit = keys.some((k) => {
        const v = (row as any)[k];
        if (v == null) return false;
        return String(v).toLowerCase().includes(lower);
      });
      if (hit) set.add(i);
    });
    return set;
  }, [lower, data, keys]);

  return (
    <div className={cn("w-full", className)}>
      <div className="mb-6">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="w-full max-w-sm bg-transparent border-0 border-b border-white/15 focus:border-white pb-2 text-sm outline-none transition-colors placeholder:text-white/30"
        />
      </div>

      {data.length === 0 ? (
        <div className="border border-dashed border-white/10 rounded-md py-16 text-center text-sm text-white/40">
          {emptyState ?? "No data."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                {columns.map((c) => (
                  <th
                    key={String(c.key)}
                    style={c.width ? { width: c.width } : undefined}
                    className={cn(
                      "label-caps text-left px-3 py-3 font-medium text-white/50",
                      c.className,
                    )}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => {
                const dim = lower && !matches.has(i);
                return (
                  <tr
                    key={rowKey ? rowKey(row, i) : (row.id ?? i)}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cn(
                      "group border-b border-white/[0.06] transition-opacity duration-200 odd:bg-white/5 even:bg-white/0",
                      dim ? "opacity-20" : "opacity-100 hover:bg-white/[0.08]",
                      onRowClick && "cursor-pointer",
                    )}
                  >
                    {columns.map((c) => (
                      <td
                        key={String(c.key)}
                        className={cn("px-3 py-4 text-sm text-white/90 align-middle", c.className)}
                      >
                        {c.render ? c.render(row) : (row as any)[c.key] ?? "—"}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default SpotlightTable;
