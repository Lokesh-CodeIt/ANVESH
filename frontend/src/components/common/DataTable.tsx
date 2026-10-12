import React from 'react';
import { ArrowUpDown } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  caption: string;
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  onSort?: (key: string) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  caption,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found matching your clinical query.',
  onSort,
  className = '',
}: DataTableProps<T>) {
  return (
    <div className={`anvesh-table-container ${className}`}>
      <table className="anvesh-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`table-header text-${col.align || 'left'} ${col.sortable ? 'is-sortable' : ''}`}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                <div className="table-header-content">
                  <span>{col.header}</span>
                  {col.sortable && (
                    <ArrowUpDown size={14} className="sort-icon" aria-hidden="true" />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="table-loading-cell">
                <div className="table-skeleton-row" />
                <div className="table-skeleton-row" />
                <div className="table-skeleton-row" />
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr key={keyExtractor(item)} className="table-row">
                {columns.map((col) => (
                  <td key={col.key} className={`table-cell text-${col.align || 'left'}`}>
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
