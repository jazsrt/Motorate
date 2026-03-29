import React, { useState } from 'react';

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
    <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8, overflow: 'hidden', background: '#0a0d14' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', background: '#0e1320', border: 'none', cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: '#F97316', display: 'flex' }}>{icon}</div>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: '#eef4f8', letterSpacing: '0.04em' }}>{title}</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#5a6e7e' }}>({modCount})</span>
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7a8e9e" strokeWidth="2" style={{ transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </button>

      {isOpen && (
        <div style={{ padding: 14, background: '#0a0d14', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          {children}
        </div>
      )}
    </div>
  );
}
