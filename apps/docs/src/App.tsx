import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { MYGRID_CORE_VERSION } from '@inno-grid/mygrid-core';
import { navigation, pageForPath, searchPages } from './content';
import type { Block, DocPage } from './content/types';
import { HighlightedCode } from './highlight';
import { LiveExample } from './live-examples';

type DocsTheme = 'light' | 'dark';

const notFound: DocPage = {
  path: '/404',
  title: 'Page not found',
  description: 'That documentation page is not part of MyGrid v1.',
  section: 'Help',
  blocks: [
    {
      kind: 'p',
      text: 'This address is not a MyGrid v1 page. Use the sidebar or search to open a guide.',
    },
  ],
};

export function App() {
  const [path, go] = usePath();
  const [theme, setTheme] = useDocsTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const page = pageForPath(path) ?? notFound;
  const results = searchPages(query);

  usePageMeta(page);

  const navigate = useCallback(
    (href: string) => {
      setMenuOpen(false);
      setQuery('');
      go(href);
    },
    [go],
  );

  return (
    <div className="shell">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="top">
        <a
          className="brand"
          href="/"
          onClick={(event) => {
            if (plainClick(event)) {
              event.preventDefault();
              navigate('/');
            }
          }}
        >
          <span className="mark" aria-hidden="true">
            Mg
          </span>
          <span>
            <span className="eyebrow">inno-grid</span>
            <span className="brand-name">MyGrid docs</span>
          </span>
        </a>
        <form
          className="search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <label htmlFor="docs-search">Search</label>
          <input
            id="docs-search"
            type="search"
            value={query}
            placeholder="Search guides and APIs"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
          />
          {query.trim().length >= 2 ? (
            <ul className="search-results">
              {results.length === 0 ? (
                <li>No matching page.</li>
              ) : (
                results.map((item) => (
                  <li key={item.path}>
                    <DocLink href={item.path} onNavigate={navigate}>
                      {item.title}
                    </DocLink>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </form>
        <div className="top-actions">
          <button
            type="button"
            aria-pressed={theme === 'dark'}
            onClick={() => {
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
          >
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
          <button
            type="button"
            className="menu"
            aria-expanded={menuOpen}
            aria-controls="docs-nav"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
          >
            {menuOpen ? 'Close menu' : 'Open menu'}
          </button>
        </div>
      </header>
      <div className="frame">
        <nav id="docs-nav" className={menuOpen ? 'side open' : 'side'} aria-label="Documentation">
          {navigation.map((group) => (
            <div key={group.label}>
              <p className="nav-label">{group.label}</p>
              <ul>
                {group.pages.map((item) => (
                  <li key={item.path}>
                    <DocLink
                      href={item.path}
                      onNavigate={navigate}
                      current={item.path === page.path}
                    >
                      {item.label}
                    </DocLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="nav-version">Core {MYGRID_CORE_VERSION}</p>
        </nav>
        <main id="content">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li>
                <DocLink href="/" onNavigate={navigate}>
                  MyGrid
                </DocLink>
              </li>
              <li>{page.section}</li>
              <li aria-current="page">{page.title}</li>
            </ol>
          </nav>
          <article>
            <h1>{page.title}</h1>
            <p className="lede">{page.description}</p>
            {page.blocks.map((block, index) => (
              <BlockView key={blockKey(block, index)} block={block} />
            ))}
          </article>
        </main>
      </div>
    </div>
  );
}

function BlockView({ block }: { readonly block: Block }) {
  switch (block.kind) {
    case 'p':
      return <p>{block.text}</p>;
    case 'h2':
      return <h2 id={block.id}>{block.text}</h2>;
    case 'h3':
      return <h3 id={block.id}>{block.text}</h3>;
    case 'list':
      return (
        <ul>
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case 'code':
      return <CodeSample code={block.code} language={block.language} />;
    case 'table':
      return (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {block.headers.map((header) => (
                  <th key={header} scope="col">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row) => (
                <tr key={row.join('|')}>
                  {row.map((cell, cellIndex) => (
                    <td key={`${cell}-${String(cellIndex)}`}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'note':
      return <p className="note">{block.text}</p>;
    case 'live':
      return (
        <div className="live">
          <LiveExample id={block.id} />
        </div>
      );
    default: {
      const unreachable: never = block;
      return unreachable;
    }
  }
}

function CodeSample({ code, language }: { readonly code: string; readonly language: string }) {
  const [label, setLabel] = useState('Copy');
  return (
    <div className="sample">
      <div className="sample-bar">
        <span>{language}</span>
        <button
          type="button"
          onClick={() => {
            void copySample(code, setLabel);
          }}
        >
          {label}
        </button>
      </div>
      <pre>
        <code>
          <HighlightedCode code={code} />
        </code>
      </pre>
    </div>
  );
}

function DocLink({
  href,
  children,
  onNavigate,
  current = false,
}: {
  readonly href: string;
  readonly children: ReactNode;
  readonly onNavigate: (href: string) => void;
  readonly current?: boolean;
}) {
  return (
    <a
      href={href}
      {...(current ? { 'aria-current': 'page' as const } : {})}
      onClick={(event) => {
        if (plainClick(event)) {
          event.preventDefault();
          onNavigate(href);
        }
      }}
    >
      {children}
    </a>
  );
}

function plainClick(event: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button: number;
}): boolean {
  return !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && event.button === 0;
}

function usePath(): readonly [string, (href: string) => void] {
  const [path, setPath] = useState(() => normalize(window.location.pathname));
  useEffect(() => {
    const onPop = (): void => {
      setPath(normalize(window.location.pathname));
    };
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
    };
  }, []);
  const go = useCallback((href: string) => {
    const next = normalize(href);
    if (next !== normalize(window.location.pathname)) {
      window.history.pushState(null, '', next);
    }
    setPath(next);
    window.scrollTo(0, 0);
  }, []);
  return [path, go];
}

function useDocsTheme(): readonly [DocsTheme, (theme: DocsTheme) => void] {
  const [theme, setTheme] = useState<DocsTheme>(() => storedTheme());
  useEffect(() => {
    document.documentElement.dataset.docsTheme = theme;
    window.localStorage.setItem('mygrid-docs-theme', theme);
  }, [theme]);
  return [theme, setTheme];
}

function storedTheme(): DocsTheme {
  const stored = window.localStorage.getItem('mygrid-docs-theme');
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function usePageMeta(page: DocPage): void {
  useEffect(() => {
    document.title = `${page.title} · MyGrid`;
    setMeta('description', page.description);
    setMeta('og:title', `${page.title} · MyGrid`, 'property');
    setMeta('og:description', page.description, 'property');
  }, [page]);
}

function setMeta(name: string, content: string, attribute: 'name' | 'property' = 'name'): void {
  const selector = attribute === 'name' ? `meta[name="${name}"]` : `meta[property="${name}"]`;
  const node = document.querySelector(selector);
  if (node !== null) {
    node.setAttribute('content', content);
  }
}

function normalize(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname === '' ? '/' : pathname;
}

function blockKey(block: Block, index: number): string {
  switch (block.kind) {
    case 'h2':
    case 'h3':
      return block.id;
    case 'live':
      return block.id;
    case 'code':
      return `${block.language}-${String(index)}`;
    default:
      return `${block.kind}-${String(index)}`;
  }
}

async function copySample(code: string, setLabel: (label: string) => void): Promise<void> {
  try {
    await navigator.clipboard.writeText(code);
    setLabel('Copied');
  } catch {
    setLabel('Copy failed');
  }
}
