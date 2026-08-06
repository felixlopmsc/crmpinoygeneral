#!/usr/bin/env node
/**
 * Fails the build on off-scale Tailwind opacity modifiers.
 *
 * Why this exists: Tailwind 3 only generates an opacity modifier when the
 * number is a step on `theme.opacity`. `bg-white/85` is not a step, so it
 * compiles to *nothing at all* — no warning, no error, no CSS. The element
 * silently keeps whatever it inherited.
 *
 * That is not hypothetical. `components/landing/landing-nav.tsx` shipped
 * `bg-white/85` on the sticky header, which meant the header had no background
 * on production: page content scrolled visibly through the navigation. It read
 * as a rendering glitch, not as a typo, which is exactly why it survived.
 *
 * Off-scale values are still allowed — they just have to use the arbitrary
 * form, which Tailwind does compile: `bg-white/[0.85]`.
 *
 * Usage: node scripts/check-opacity-scale.mjs
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Tailwind 3's default theme.opacity. If tailwind.config.ts ever extends this,
// extend the set here too — the point is to mirror what actually compiles.
const SCALE = new Set(['0', '5', '10', '20', '25', '30', '40', '50', '60', '70', '75', '80', '90', '95', '100']);

const UTILITIES = [
  'bg', 'text', 'border', 'ring', 'ring-offset', 'shadow', 'from', 'via', 'to',
  'fill', 'stroke', 'divide', 'outline', 'placeholder', 'accent', 'caret',
  'decoration',
];

// The leading `-` in the lookbehind matters: without it, the positional
// fractions inside tailwindcss-animate utilities — `slide-in-from-left-1/2`,
// `slide-out-to-left-1/2` — match as `from-left-1/2` and report as opacity.
// They are fractions, and 1/2 is not a colour at half alpha.
const PATTERN = new RegExp(
  String.raw`(?<![\w\[-])((?:${UTILITIES.join('|')})-(?:\[[^\]\s]+\]|[a-zA-Z0-9#./-]+?))/(\d{1,3})(?![\d\w[])`,
  'g',
);

// Comments are skipped so a comment that *names* the broken pattern — as a
// warning to the next person — does not itself trip the check. Block state is
// tracked across lines because the interesting warnings are the multi-line
// JSX ones, and those have continuation lines with no marker of their own.
function makeCommentFilter() {
  let inBlock = false;
  return (line) => {
    const wasInBlock = inBlock;
    const opens = (line.match(/\/\*/g) || []).length;
    const closes = (line.match(/\*\//g) || []).length;
    if (opens > closes) inBlock = true;
    else if (closes > opens) inBlock = false;
    return wasInBlock || inBlock || /^\s*(\/\/|\/\*|\*|<!--)/.test(line);
  };
}

const files = execSync("git ls-files '*.tsx' '*.ts' '*.jsx' '*.js' '*.css'", { encoding: 'utf8' })
  .split('\n')
  .filter(Boolean);

const findings = [];
for (const file of files) {
  if (file.startsWith('scripts/')) continue;
  const lines = readFileSync(file, 'utf8').split('\n');
  const isComment = makeCommentFilter();
  lines.forEach((line, i) => {
    if (isComment(line)) return;
    for (const match of line.matchAll(PATTERN)) {
      if (SCALE.has(match[2])) continue;
      findings.push({ file, line: i + 1, cls: match[0], suggest: `${match[1]}/[0.${match[2].padStart(2, '0')}]` });
    }
  });
}

if (findings.length === 0) {
  console.log('✓ every opacity modifier is on the Tailwind scale');
  process.exit(0);
}

console.error(`✗ ${findings.length} off-scale opacity modifier${findings.length === 1 ? '' : 's'} — these compile to no CSS:\n`);
for (const f of findings) {
  console.error(`  ${f.file}:${f.line}`);
  console.error(`    ${f.cls}   →   use a scale step, or ${f.suggest}`);
}
console.error(`\n  Scale steps: ${[...SCALE].join(' ')}`);
process.exit(1);
