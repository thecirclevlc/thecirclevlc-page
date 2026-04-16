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

// 1. Replaces a single marker
{
  const html = '<title><!--META:title-->DEFAULT<!--/META:title--></title>';
  const out  = injectMeta(html, { title: 'NEW' });
  assertEq(
    'single replace',
    out,
    '<title><!--META:title-->NEW<!--/META:title--></title>',
  );
}

// 2. Leaves markers whose key is not in values
{
  const html = '<a><!--META:title-->A<!--/META:title--></a><b><!--META:description-->B<!--/META:description--></b>';
  const out  = injectMeta(html, { title: 'X' });
  assertEq(
    'partial values',
    out,
    '<a><!--META:title-->X<!--/META:title--></a><b><!--META:description-->B<!--/META:description--></b>',
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
    '<t><!--META:title-->&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;<!--/META:title--></t>',
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
    '<x><!--META:title-->T2<!--/META:title--></x>',
  );
}

// 6. Regex-metachar key in values is skipped safely (new — covers Issue B)
{
  const html = '<x><!--META:title-->T<!--/META:title--></x>';
  const out  = injectMeta(html, { title: 'OK', '.*': 'BOOM' });
  assertEq(
    'regex metachar key skipped',
    out,
    '<x><!--META:title-->OK<!--/META:title--></x>',
  );
}

if (failures > 0) {
  console.error(`\n${failures} test(s) failed`);
  process.exit(1);
}
console.log('\nAll smoke tests passed.');
