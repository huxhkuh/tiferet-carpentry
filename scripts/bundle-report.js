/**
 * Bundle size report & budget enforcer — runs after `npm run build` in CI.
 *
 * Budgets are loaded from config/bundle-budget.json (versioned alongside source).
 * Process exits non-zero on any budget violation.
 *
 * Checks:
 *   - Total JS size
 *   - Total CSS size
 *   - Interactive application size
 *   - On-demand source-document size (tracked separately)
 *   - Per-file budget (configurable per chunk name prefix, with default fallback)
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const DIST_DIR = 'dist';
const BUDGET_FILE = 'config/bundle-budget.json';

const budget = JSON.parse(readFileSync(BUDGET_FILE, 'utf8'));

function normalizePath(path) {
  return path.replace(/\\/g, '/');
}

function isOnDemandDocument(path) {
  const normalized = normalizePath(path).toLowerCase();
  const prefixes = budget.onDemandDocuments?.pathPrefixes ?? [];
  return prefixes.some((prefix) => normalized.startsWith(normalizePath(prefix).toLowerCase()));
}

function walkDir(dir) {
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(full));
    } else {
      results.push(full);
    }
  }
  return results;
}

const files = walkDir(DIST_DIR);
const groups = { js: [], css: [], html: [], other: [] };

for (const f of files) {
  const ext = extname(f).toLowerCase();
  const size = statSync(f).size;
  const entry = { path: normalizePath(f), size };
  if (ext === '.js' || ext === '.mjs') groups.js.push(entry);
  else if (ext === '.css') groups.css.push(entry);
  else if (ext === '.html') groups.html.push(entry);
  else groups.other.push(entry);
}

function fmtKB(bytes) {
  return (bytes / 1024).toFixed(1) + ' KB';
}

function fileBudgetKB(path) {
  const name = basename(path).toLowerCase();
  for (const [prefix, kb] of Object.entries(budget.perFileKB)) {
    if (prefix === '_default') continue;
    if (name.startsWith(prefix.toLowerCase())) return kb;
  }
  return budget.perFileKB._default;
}

console.log('📦 Bundle Size Report');
console.log('='.repeat(60));

for (const [label, items] of Object.entries(groups)) {
  if (items.length === 0) continue;
  console.log(`\n${label.toUpperCase()} (${items.length} files):`);
  items.sort((a, b) => b.size - a.size);
  for (const { path, size } of items) {
    console.log(`  ${fmtKB(size).padStart(10)}  ${path}`);
  }
}

const totalJS = groups.js.reduce((sum, f) => sum + f.size, 0);
const totalCSS = groups.css.reduce((sum, f) => sum + f.size, 0);
const entries = Object.values(groups).flat();
const onDemandDocuments = entries.filter((entry) => isOnDemandDocument(entry.path));
const applicationFiles = entries.filter((entry) => !isOnDemandDocument(entry.path));
const totalApplication = applicationFiles.reduce((sum, entry) => sum + entry.size, 0);
const totalDocuments = onDemandDocuments.reduce((sum, entry) => sum + entry.size, 0);

console.log('\n' + '='.repeat(60));
console.log(`Total JS:  ${fmtKB(totalJS).padStart(12)}    Budget: ${budget.totalJsKB} KB`);
console.log(`Total CSS: ${fmtKB(totalCSS).padStart(12)}    Budget: ${budget.totalCssKB} KB`);
console.log(`App total: ${fmtKB(totalApplication).padStart(11)}    Budget: ${budget.totalAllKB} KB`);
if (onDemandDocuments.length > 0) {
  console.log(`Documents: ${fmtKB(totalDocuments).padStart(11)}    Budget: ${budget.onDemandDocuments.totalKB} KB`);
}

const violations = [];

if (totalJS / 1024 > budget.totalJsKB) {
  violations.push(`Total JS ${fmtKB(totalJS)} > ${budget.totalJsKB} KB`);
}
if (totalCSS / 1024 > budget.totalCssKB) {
  violations.push(`Total CSS ${fmtKB(totalCSS)} > ${budget.totalCssKB} KB`);
}
if (totalApplication / 1024 > budget.totalAllKB) {
  violations.push(`App total ${fmtKB(totalApplication)} > ${budget.totalAllKB} KB`);
}
if (onDemandDocuments.length > 0 && totalDocuments / 1024 > budget.onDemandDocuments.totalKB) {
  violations.push(`On-demand documents ${fmtKB(totalDocuments)} > ${budget.onDemandDocuments.totalKB} KB`);
}

console.log('\nPer-file checks (JS):');
for (const f of groups.js) {
  const limitKB = fileBudgetKB(f.path);
  const okSym = f.size / 1024 > limitKB ? '❌' : '✅';
  console.log(`  ${okSym} ${fmtKB(f.size).padStart(10)} / ${limitKB} KB    ${f.path}`);
  if (f.size / 1024 > limitKB) {
    violations.push(`${f.path} ${fmtKB(f.size)} > ${limitKB} KB`);
  }
}

// Sprint 106 — per-asset budgets for static files (icons, images, etc.).
function assetBudgetKB(path) {
  const name = basename(path).toLowerCase();
  const perAsset = budget.perAssetKB ?? { _default: 50 };
  if (Object.prototype.hasOwnProperty.call(perAsset, name)) return perAsset[name];
  return perAsset._default;
}

const staticAssets = groups.other.filter(
  (f) => !isOnDemandDocument(f.path) && /\.(png|jpg|jpeg|gif|webp|avif|svg|ico)$/i.test(f.path),
);
if (staticAssets.length > 0) {
  console.log('\nPer-asset checks (images/icons):');
  for (const f of staticAssets) {
    const limitKB = assetBudgetKB(f.path);
    const okSym = f.size / 1024 > limitKB ? '❌' : '✅';
    console.log(`  ${okSym} ${fmtKB(f.size).padStart(10)} / ${limitKB} KB    ${f.path}`);
    if (f.size / 1024 > limitKB) {
      violations.push(`${f.path} ${fmtKB(f.size)} > ${limitKB} KB`);
    }
  }
}

if (onDemandDocuments.length > 0) {
  console.log('\nPer-file checks (on-demand source documents):');
  for (const f of onDemandDocuments) {
    const limitKB = budget.onDemandDocuments.perFileKB;
    const okSym = f.size / 1024 > limitKB ? '❌' : '✅';
    console.log(`  ${okSym} ${fmtKB(f.size).padStart(10)} / ${limitKB} KB    ${f.path}`);
    if (f.size / 1024 > limitKB) {
      violations.push(`${f.path} ${fmtKB(f.size)} > ${limitKB} KB`);
    }
  }
}

if (violations.length > 0) {
  console.error(`\n❌ Bundle budget violations (${violations.length}):`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(`\nUpdate ${BUDGET_FILE} (with justification) or reduce bundle size.`);
  process.exit(1);
}

console.log('\n✅ All budgets within limits.');
