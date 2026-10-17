import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
  initialValue?: string;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search clinical cases, diagnoses, policies...',
  onSearch,
  className = '',
  initialValue = '',
}) => {
  const [query, setQuery] = useState(initialValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form onSubmit={handleSubmit} role="search" className={`flex items-center gap-3 w-full ${className}`}>
      <label htmlFor="clinical-search-input" className="sr-only">
        {placeholder}
      </label>
      <div className="clinical-search-wrapper flex-1">
        <input
          id="clinical-search-input"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="clinical-search-input"
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Clear search query"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <button 
        type="submit" 
        className="px-5 py-2.5 bg-[#0F766E] hover:bg-[#0D655E] text-white font-semibold text-sm rounded-xl transition-colors shadow-xs shrink-0"
      >
        Search
      </button>
    </form>
  );
};
