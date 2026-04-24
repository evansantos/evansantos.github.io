import type { FixturePost, Lang } from '../core/types.js';

interface Props {
  items: FixturePost[];
  lang:  Lang;
}

export default function PostList({ items, lang }: Props) {
  if (items.length === 0) {
    return <div className="terminal__echo">no posts found</div>;
  }

  return (
    <ul className="terminal__post-list" aria-label={`${items.length} post${items.length === 1 ? '' : 's'}`}>
      {items.map(post => (
        <li key={`${post.lang}/${post.slug}`} className="terminal__post-item">
          <span className="terminal__post-date">{post.date}</span>
          <a href={`/${lang}/blog/${post.slug}`} className="terminal__echo">
            {post.title}
          </a>
          {post.tags.map(tag => (
            <span key={tag} className="terminal__post-tag">{tag}</span>
          ))}
          <div className="terminal__post-dek">{post.dek}</div>
        </li>
      ))}
    </ul>
  );
}
