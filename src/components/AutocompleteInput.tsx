import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AutocompleteInputProps {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  required?: boolean;
  disabled?: boolean;
  inputMode?: 'text' | 'numeric';
}

export function AutocompleteInput({
  label,
  placeholder = 'Type or select...',
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  inputMode = 'text',
}: AutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = query
    ? options.filter(o => o.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Sync query when value is cleared externally
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <label
        style={{
          display: 'block',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase' as const,
          letterSpacing: 1,
          color: '#8090a4',
          marginBottom: 6,
          fontFamily: "'Space Grotesk', sans-serif",
        }}
      >
        {label}{required && ' *'}
      </label>

      <div
        onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: disabled ? 'rgba(20,28,40,.4)' : 'rgba(20,28,40,.7)',
          border: `1px solid ${open ? '#F97316' : 'rgba(255,255,255,.08)'}`,
          borderRadius: 12,
          padding: '10px 12px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color .2s',
        }}
      >
        <input
          ref={inputRef}
          value={open ? query : value}
          readOnly={disabled}
          inputMode={inputMode}
          placeholder={disabled ? 'Select make first' : placeholder}
          onChange={e => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => { if (!disabled) setOpen(true); }}
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: disabled ? 'rgba(128,144,164,.5)' : '#f2f4f7',
            fontSize: 14,
            fontFamily: "'Space Grotesk', sans-serif",
            fontStyle: disabled ? 'italic' : 'normal',
          }}
        />
        <ChevronDown
          size={14}
          style={{
            color: '#586878',
            transition: 'transform .2s',
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            flexShrink: 0,
          }}
        />
      </div>

      {open && filtered.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            background: '#141c28',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 12,
            maxHeight: 200,
            overflowY: 'auto',
            zIndex: 50,
            boxShadow: '0 8px 24px rgba(0,0,0,.5)',
          }}
        >
          {filtered.map(opt => (
            <div
              key={opt}
              onClick={() => {
                onChange(opt);
                setOpen(false);
                setQuery('');
              }}
              style={{
                padding: '10px 14px',
                fontSize: 13,
                color: opt === value ? '#F97316' : '#c0c8d4',
                fontWeight: opt === value ? 600 : 400,
                cursor: 'pointer',
                transition: 'background .15s',
                fontFamily: "'Space Grotesk', sans-serif",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {opt}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
