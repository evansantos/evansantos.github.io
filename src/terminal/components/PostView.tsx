import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { FixturePost, Lang } from '../core/types.js';

interface Props {
  post: FixturePost;
  lang: Lang;
}

export default function PostView({ post, lang }: Props) {
  return (
    <div className="terminal__post-view">
      <div className="terminal__echo" style={{ marginBottom: '0.5rem', color: 'var(--t-accent)' }}>
        {post.title}
      </div>
      <div style={{ color: 'var(--t-fg-muted)', fontSize: '0.85em', marginBottom: '1rem' }}>
        {post.date} · {post.readingTime} min · {post.tags.join(', ')}
      </div>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {post.body}
      </ReactMarkdown>
      <div style={{ marginTop: '1rem', borderTop: '1px solid var(--t-border)', paddingTop: '0.5rem' }}>
        <a href={`/${lang}/blog/${post.slug}`} style={{ color: 'var(--t-accent)' }}>
          view in browser →
        </a>
      </div>
    </div>
  );
}
