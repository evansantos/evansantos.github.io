import type { GrepMatch } from '../core/types.js';

interface Props {
  matches: GrepMatch[];
}

function HighlightedExcerpt({ excerpt, matchStart, matchEnd }: {
  excerpt:    string;
  matchStart: number;
  matchEnd:   number;
}) {
  const before = excerpt.slice(0, matchStart);
  const match  = excerpt.slice(matchStart, matchEnd);
  const after  = excerpt.slice(matchEnd);

  return (
    <span className="terminal__grep-excerpt">
      {before}
      <mark className="terminal__grep-mark">{match}</mark>
      {after}
    </span>
  );
}

export default function GrepResult({ matches }: Props) {
  if (matches.length === 0) {
    return (
      <div className="terminal__grep-result">
        <span className="terminal__grep-excerpt">(no matches)</span>
      </div>
    );
  }

  return (
    <div className="terminal__grep-result">
      {matches.map((m, i) => (
        <div key={`${m.slug}-${i}`} className="terminal__grep-item">
          <span className="terminal__grep-title">{m.slug} — {m.title}</span>
          <HighlightedExcerpt
            excerpt={m.excerpt}
            matchStart={m.matchStart}
            matchEnd={m.matchEnd}
          />
        </div>
      ))}
    </div>
  );
}
