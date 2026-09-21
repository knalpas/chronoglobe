import { useState } from 'react';
import type { LayerToggles } from './Globe';

interface HeaderProps {
  layers: LayerToggles;
  onToggleLayer: (key: keyof LayerToggles) => void;
  onAbout: () => void;
  onCopyLink?: () => void;
}

export default function Header({ layers, onToggleLayer, onAbout, onCopyLink }: HeaderProps) {
  const [copied, setCopied] = useState(false);
  return (
    <header className="header">
      <div className="brand">
        <div className="brand-mark" aria-hidden>
          <svg viewBox="0 0 32 32" width="30" height="30">
            <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <ellipse cx="16" cy="16" rx="6" ry="13" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <line x1="3" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.7" />
            <path d="M16 3 A13 13 0 0 1 29 16" fill="none" stroke="currentColor" strokeWidth="3" />
          </svg>
        </div>
        <div>
          <div className="brand-title">Chronoglobe</div>
          <div className="brand-sub">An atlas of seven thousand years</div>
        </div>
      </div>
      <div className="header-controls">
        <div className="toggle-group" role="group" aria-label="Layers">
          <button className={`toggle${layers.labels ? ' on' : ''}`} onClick={() => onToggleLayer('labels')}>
            Names
          </button>
          <button className={`toggle${layers.events ? ' on' : ''}`} onClick={() => onToggleLayer('events')}>
            Events
          </button>
          <button className={`toggle${layers.graticule ? ' on' : ''}`} onClick={() => onToggleLayer('graticule')}>
            Grid
          </button>
        </div>
        {onCopyLink && (
          <button
            className="toggle"
            onClick={() => {
              onCopyLink();
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1600);
            }}
            title="Copy a link to this year"
          >
            {copied ? 'Copied' : 'Link'}
          </button>
        )}
        <button className="toggle" onClick={onAbout}>
          About<span className="hide-narrow"> &amp; sources</span>
        </button>
      </div>
    </header>
  );
}
