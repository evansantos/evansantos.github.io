import { assert } from 'poku';
import { formatDate, formatDateISO } from '../../src/lib/date.js';

// Use ISO string constructor — same as Astro frontmatter date parsing.
// formatters use timeZone: 'UTC' so this is consistent.
const march10 = new Date('2025-03-10');

assert.strictEqual(
  formatDate(march10, 'en'),
  'March 10, 2025',
  'formatDate returns long EN format'
);

assert.strictEqual(
  formatDate(march10, 'pt'),
  '10 de março de 2025',
  'formatDate returns long PT format'
);

assert.strictEqual(
  formatDateISO(march10),
  '2025-03-10',
  'formatDateISO returns YYYY-MM-DD'
);
