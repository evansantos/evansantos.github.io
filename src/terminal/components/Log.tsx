import type { Result, Lang } from '../core/types.js';
import EchoLine  from './EchoLine.js';
import ErrorLine from './ErrorLine.js';
import PostList  from './PostList.js';
import PostView  from './PostView.js';
import Table     from './Table.js';

export interface LogEntry {
  id:      number;
  input?:  string;
  result:  Result;
}

interface Props {
  entries: LogEntry[];
  lang:    Lang;
}

function ResultRenderer({ result, lang }: { result: Result; lang: Lang }) {
  switch (result.type) {
    case 'echo':
      return <EchoLine text={result.text} />;
    case 'error':
      return <ErrorLine text={result.text} hint={result.hint} />;
    case 'post-list':
      return <PostList items={result.items} lang={lang} />;
    case 'post-view':
      return <PostView post={result.post} lang={lang} />;
    case 'table':
      return <Table columns={result.columns} rows={result.rows} />;
    case 'empty':
      return null;
    case 'clear':
    case 'navigate':
    case 'neofetch':
    case 'grep-result':
    case 'pager':
    case 'project-list':
      return <EchoLine text={`[${result.type} — not yet rendered]`} />;
    default:
      return null;
  }
}

export default function Log({ entries, lang }: Props) {
  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions text"
      aria-label="terminal output"
      className="terminal__log"
    >
      {entries.map(entry => (
        <div key={entry.id} className="terminal__log-entry">
          {entry.input !== undefined && (
            <div className="terminal__log-entry-input" aria-hidden="true">
              {entry.input}
            </div>
          )}
          <ResultRenderer result={entry.result} lang={lang} />
        </div>
      ))}
    </div>
  );
}
