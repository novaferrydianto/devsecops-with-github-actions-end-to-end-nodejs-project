import fs from 'fs/promises';
import path from 'path';

/**
 * 🎨 Coverage Makeover Script
 * Transform boring Istanbul/c8 reports into Premium Security Dashboards.
 */

const COVERAGE_DIR = './coverage';
const BASE_CSS_PATH = path.join(COVERAGE_DIR, 'base.css');

const PREMIUM_CSS = `
/* --- 🌑 Premium Dark Mode Makeover --- */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=JetBrains+Mono&display=swap');

:root {
  --bg-deep: #0f172a;
  --bg-surface: #1e293b;
  --text-main: #f1f5f9;
  --text-muted: #94a3b8;
  --primary: #38bdf8;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
  --border: #334155;
}

body {
  background-color: var(--bg-deep) !important;
  color: var(--text-main) !important;
  font-family: 'Inter', system-ui, sans-serif !important;
  line-height: 1.6;
}

h1, .path a {
  color: var(--primary) !important;
  font-weight: 600 !important;
  letter-spacing: -0.025em;
}

.path a { opacity: 0.8; }
.path a:hover { opacity: 1; color: var(--primary) !important; }

.pad1 {
  background: var(--bg-surface) !important;
  border-bottom: 1px solid var(--border) !important;
  padding: 2rem !important;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}

.coverage-summary {
  background: var(--bg-surface) !important;
  border: 1px solid var(--border) !important;
  border-radius: 12px !important;
  overflow: hidden;
  margin-top: 2rem !important;
}

.coverage-summary th {
  background: #0f172a !important;
  color: var(--text-muted) !important;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding: 1rem !important;
}

.coverage-summary td {
  border-top: 1px solid var(--border) !important;
  padding: 1rem !important;
}

/* Status Colors Hardening */
.status-line.high { background: var(--success) !important; height: 6px !important; }
.status-line.medium { background: var(--warning) !important; height: 6px !important; }
.status-line.low { background: var(--danger) !important; height: 6px !important; }

.high { background: rgba(16, 185, 129, 0.1) !important; }
.medium { background: rgba(245, 158, 11, 0.1) !important; }
.low { background: rgba(239, 68, 68, 0.1) !important; }

pre.prettyprint {
  background: #0f172a !important;
  border: 1px solid var(--border) !important;
  border-radius: 8px !important;
  padding: 1.5rem !important;
  font-family: 'JetBrains Mono', monospace !important;
  box-shadow: inset 0 2px 4px 0 rgb(0 0 0 / 0.05);
}

.cline-any { background: rgba(56, 189, 248, 0.1) !important; border-left: 3px solid var(--primary) !important; }
.cline-no { background: rgba(239, 68, 68, 0.2) !important; border-left: 3px solid var(--danger) !important; }

/* 🌈 Syntax Highlighting (Prettify Dark Mode) */
.pln { color: var(--text-main) !important; } /* Plain text */
.kwd { color: #818cf8 !important; font-weight: bold; } /* Keywords */
.str { color: #34d399 !important; } /* Strings */
.com { color: var(--text-muted) !important; font-style: italic; } /* Comments */
.typ { color: #f472b6 !important; } /* Types */
.lit { color: #fbbf24 !important; } /* Literals */
.pun { color: #94a3b8 !important; } /* Punctuation */
.tag { color: #f87171 !important; } /* HTML tags */
.atn { color: #fbbf24 !important; } /* Attributes */
.atv { color: #38bdf8 !important; } /* Attribute values */
.dec { color: #94a3b8 !important; } /* Declarations */

.footer {
  color: var(--text-muted) !important;
  border-top: 1px solid var(--border) !important;
  padding-top: 2rem !important;
  font-size: 0.75rem;
}

.footer a { color: var(--primary) !important; }

/* Scrollbar Hardening */
::-webkit-scrollbar { width: 10px; }
::-webkit-scrollbar-track { background: var(--bg-deep); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 5px; }
::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
`;

async function makeover() {
  try {
    console.log('🎨 Starting Coverage Makeover...');
    
    // 1. Inject CSS
    const currentCss = await fs.readFile(BASE_CSS_PATH, 'utf8');
    if (!currentCss.includes('🌑 Premium Dark Mode')) {
      await fs.appendFile(BASE_CSS_PATH, PREMIUM_CSS);
      console.log('✅ Base CSS upgraded to Premium Dark Mode.');
    } else {
      console.log('ℹ️ Premium Dark Mode already present.');
    }

    console.log('✨ Makeover complete! Wow the user now.');
  } catch (err) {
    console.error('❌ Makeover failed:', err.message);
  }
}

makeover();
