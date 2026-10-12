import React, { useRef } from 'react';

export interface TabItem {
  id: string;
  label: string;
  badge?: string | number;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }

    if (nextIndex !== -1) {
      e.preventDefault();
      onChange(tabs[nextIndex].id);
      const tabButtons = tabListRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
      if (tabButtons && tabButtons[nextIndex]) {
        tabButtons[nextIndex].focus();
      }
    }
  };

  const activeItem = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <div className={`anvesh-tabs-container ${className}`}>
      <div ref={tabListRef} role="tablist" aria-label="Portal Navigation Tabs" className="anvesh-tablist">
        {tabs.map((tab, idx) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`anvesh-tab-btn ${isSelected ? 'is-active' : ''}`}
            >
              <span>{tab.label}</span>
              {tab.badge !== undefined && <span className="anvesh-tab-badge">{tab.badge}</span>}
              {isSelected && <span className="anvesh-tab-indicator" aria-hidden="true" />}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeItem.id}`}
        aria-labelledby={`tab-${activeItem.id}`}
        tabIndex={0}
        className="anvesh-tabpanel"
      >
        {activeItem.content}
      </div>
    </div>
  );
};
