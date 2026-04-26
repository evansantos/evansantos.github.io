import type { MarkdownBlock } from './types.js';

export function parseMarkdownBlocks(body: string): MarkdownBlock[] {
  if (!body.trim()) return [];

  const blocks: MarkdownBlock[] = [];
  let remaining = body.trim();

  while (remaining.length > 0) {
    // Code block — consume until closing ```
    if (remaining.startsWith('```')) {
      const closeIdx = remaining.indexOf('```', 3);
      if (closeIdx !== -1) {
        const raw = remaining.slice(0, closeIdx + 3);
        blocks.push({ type: 'code', raw });
        remaining = remaining.slice(closeIdx + 3).replace(/^\n+/, '');
        continue;
      }
    }

    // Find next blank-line boundary
    const boundary = remaining.search(/\n{2,}/);
    const raw = boundary === -1 ? remaining : remaining.slice(0, boundary);
    const trimmed = raw.trim();
    remaining = boundary === -1 ? '' : remaining.slice(boundary).replace(/^\n+/, '');

    if (!trimmed) continue;

    // Heading
    const headingMatch = trimmed.match(/^(#{1,6})\s/);
    if (headingMatch) {
      blocks.push({ type: 'heading', raw: trimmed, level: headingMatch[1].length });
      continue;
    }
    // Blockquote
    if (trimmed.startsWith('> ')) {
      blocks.push({ type: 'blockquote', raw: trimmed });
      continue;
    }
    // Lists
    if (/^[-*+] /.test(trimmed) || /^\d+\. /.test(trimmed)) {
      blocks.push({ type: 'list', raw: trimmed });
      continue;
    }
    // HR
    if (/^-{3,}$/.test(trimmed) || /^\*{3,}$/.test(trimmed) || /^_{3,}$/.test(trimmed)) {
      blocks.push({ type: 'hr', raw: trimmed });
      continue;
    }
    // Default: paragraph
    blocks.push({ type: 'paragraph', raw: trimmed });
  }

  return blocks;
}
