import React, { useState, useRef, useEffect } from 'react';
import { Filter, RotateCcw, ChevronDown } from 'lucide-react';
import { panelToggle } from '../../motion/patterns/panelToggle.ts';
import { useMotionPreferences } from '../../context/MotionPreferencesContext.tsx';

export interface FilterState {
  status?: string;
  hasSourceText?: string;
  viewType?: string;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  onReset: () => void;
  className?: string;
}

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onReset,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { isReducedMotion } = useMotionPreferences();

  useEffect(() => {
    if (bodyRef.current) {
      panelToggle(bodyRef.current, { isOpen, isReducedMotion });
    }
  }, [isOpen, isReducedMotion]);

  const activeCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className={`anvesh-filter-panel ${className}`}>
      <div className="filter-header">
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className="filter-toggle-btn"
        >
          <Filter size={16} aria-hidden="true" />
          <span>Filters</span>
          {activeCount > 0 && <span className="filter-count-badge">{activeCount}</span>}
          <ChevronDown
            size={16}
            className={`filter-caret ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>

        {activeCount > 0 && (
          <button onClick={onReset} className="filter-reset-btn" aria-label="Reset all filters">
            <RotateCcw size={14} aria-hidden="true" />
            <span>Reset</span>
          </button>
        )}
      </div>

      <div ref={bodyRef} className="filter-body" style={{ display: isOpen ? 'block' : 'none' }}>
        <div className="filter-grid">
          <div className="filter-item">
            <label className="anvesh-label" htmlFor="filter-status">
              Case Status
            </label>
            <select
              id="filter-status"
              value={filters.status || ''}
              onChange={(e) => onChange({ ...filters, status: e.target.value || undefined })}
              className="anvesh-select"
            >
              <option value="">All Statuses</option>
              <option value="Normal">Normal</option>
              <option value="Abnormal">Abnormal</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="anvesh-label" htmlFor="filter-view">
              View Type
            </label>
            <select
              id="filter-view"
              value={filters.viewType || ''}
              onChange={(e) => onChange({ ...filters, viewType: e.target.value || undefined })}
              className="anvesh-select"
            >
              <option value="">All Views</option>
              <option value="Frontal">Frontal</option>
              <option value="Lateral">Lateral</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="anvesh-label" htmlFor="filter-grounding">
              Clinical Text Grounding
            </label>
            <select
              id="filter-grounding"
              value={filters.hasSourceText || ''}
              onChange={(e) => onChange({ ...filters, hasSourceText: e.target.value || undefined })}
              className="anvesh-select"
            >
              <option value="">All Cases</option>
              <option value="true">Source Text Grounded</option>
              <option value="false">Missing Source Text (Capped)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
