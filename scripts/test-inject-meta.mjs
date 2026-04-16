// Standalone smoke test — run with: node scripts/test-inject-meta.mjs
// Exits non-zero on failure.

import { injectMeta, escapeHtml } from '../api/_lib/injectMeta.mjs';

let failures = 0;
function assertEq(label, actual, expected) {
  if (actual !== expected) {
    failures++;
    console.error(`FAIL ${label}`);
    console.error(`  expected: ${JSON.stringify(expected)}`);
    console.error(`  actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS ${label}`);
  }
}

// 1. Replaces a single marker and strips markers from output
{
  const html = '<title><!--META:title-->DEFAULT<!--/META:title--></title>';
  const out  = injectMeta(html, { title: 'NEW' });
  assertEq(
    'single replace (markers stripped)',
    out,
    '<title>NEW</title>',
  );
}

// 2. Strips all markers — even for keys not in values (defaults shown clean)
{
  const html = '<a><!--META:title-->A<!--/META:title--></a><b><!--META:description-->B<!--/META:description--></b>';
  const out  = injectMeta(html, { title: 'X' });
  assertEq(
    'partial values (all markers stripped)',
    out,
    '<a>X</a><b>B</b>',
  );
}

// 3. Escapes HTML-dangerous characters
{
  const out = injectMeta(
    '<t><!--META:title-->d<!--/META:title--></t>',
    { title: '<script>alert("x")</script>' },
  );
  assertEq(
    'html escape',
    out,
    '<t>&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</t>',
  );
}

// 4. escapeHtml direct
assertEq('escape amp', escapeHtml('A & B'), 'A &amp; B');

// 5. Unknown key in values is ignored
{
  const html = '<x><!--META:title-->T<!--/META:title--></x>';
  const out  = injectMeta(html, { title: 'T2', garbage: 'NO' });
  assertEq(
    'unknown key ignored',
    out,
    '<x>T2</x>',
  );
}

// 6. Regex-metachar key in values is skipped safely
{
  const html = '<x><!--META:title-->T<!--/META:title--></x>';
  const out  = injectMeta(html, { title: 'OK', '.*': 'BOOM' });
  assertEq(
    'regex metachar key skipped',
    out,
    '<x>OK</x>',
  );
}

// 7. Empty values — all markers stripped, defaults shown clean
{
  const html = '<meta content="<!--META:og_title-->THE CIRCLE<!--/META:og_title-->">';
  const out  = injectMeta(html, {});
  assertEq(
    'empty values strips markers leaving defaults',
    out,
    '<meta content="THE CIRCLE">',
  );
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log('\nAll smoke tests passed.');
