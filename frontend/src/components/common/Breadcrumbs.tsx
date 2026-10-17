import React from 'react';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs font-medium text-slate-500 mb-3 ${className}`}>
      <ol className="flex items-center flex-wrap gap-1.5 list-none p-0 m-0">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="inline-flex items-center gap-1.5">
              {isLast ? (
                <span className="font-semibold text-slate-900" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <>
                  {item.href ? (
                    <a 
                      href={item.href} 
                      className="hover:text-teal-700 transition-colors text-slate-500 hover:underline"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button 
                      type="button"
                      onClick={item.onClick} 
                      className="hover:text-teal-700 transition-colors text-slate-500 hover:underline cursor-pointer bg-transparent border-none p-0 inline-flex items-center"
                    >
                      {item.label}
                    </button>
                  )}
                  <ChevronRight size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
export default Breadcrumbs;
