import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface GarageSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  modCount: number;
  defaultOpen?: boolean;
}

export function GarageSection({
  title,
  icon,
  children,
  modCount,
  defaultOpen = false
}: GarageSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-white/[0.06] rounded-lg overflow-hidden bg-surface">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-surface-2 hover:bg-surfacehighlight transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="text-accent-primary">{icon}</div>
          <h4 className="font-semibold text-lg text-primary">{title}</h4>
          <span className="text-sm text-secondary">({modCount})</span>
        </div>
        <div className="flex items-center gap-2 text-primary">
          {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 bg-surface border-t border-white/[0.06]">
          {children}
        </div>
      )}
    </div>
  );
}
