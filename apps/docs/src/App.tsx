import { MYGRID_CORE_VERSION } from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION, MyGrid } from '@inno-grid/mygrid-react';
import { MYGRID_THEMES_VERSION, themeStylesheet } from '@inno-grid/mygrid-themes';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'packages', label: 'Packages' },
  { id: 'commands', label: 'Commands' },
  { id: 'status', label: 'Status' },
] as const;

const commands = [
  { command: 'pnpm install', detail: 'Install workspace dependencies.' },
  {
    command: 'pnpm check',
    detail: 'Format, lint, typecheck, unit test, build, Storybook, and entry-point checks.',
  },
  { command: 'pnpm dev', detail: 'Playground on port 4183 and docs on port 4184.' },
  { command: 'pnpm dev:storybook', detail: 'Component workshop on port 6008.' },
  { command: 'pnpm test:e2e', detail: 'Playwright against the built playground.' },
] as const;

export function App() {
  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="top">
        <div>
          <p className="eyebrow">inno-grid</p>
          <p className="brand-name">MyGrid docs</p>
        </div>
        <nav aria-label="Sections">
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="content">
        <section id="overview" aria-labelledby="overview-heading">
          <h1 id="overview-heading">MyGrid</h1>
          <p>
            MyGrid is a company-owned data grid library. This site describes the repository
            foundation. The grid itself is not implemented, and this project does not claim parity
            with any other grid.
          </p>
        </section>
        <section id="packages" aria-labelledby="packages-heading">
          <h2 id="packages-heading">Packages</h2>
          <dl>
            <div>
              <dt>@inno-grid/mygrid-core</dt>
              <dd>Version {MYGRID_CORE_VERSION}. Framework-independent TypeScript.</dd>
            </div>
            <div>
              <dt>@inno-grid/mygrid-react</dt>
              <dd>Version {MYGRID_REACT_VERSION}. React client adapter.</dd>
            </div>
            <div>
              <dt>@inno-grid/mygrid-themes</dt>
              <dd>
                Version {MYGRID_THEMES_VERSION}. Default stylesheet <code>{themeStylesheet}</code>,
                plus light, dark, and density exports.
              </dd>
            </div>
          </dl>
          <MyGrid theme="light" density="default">
            <p>This mount is the same React entry an application imports. It has no cells.</p>
          </MyGrid>
        </section>
        <section id="commands" aria-labelledby="commands-heading">
          <h2 id="commands-heading">Commands</h2>
          <ul className="commands">
            {commands.map((item) => (
              <li key={item.command}>
                <code>{item.command}</code>
                <span>{item.detail}</span>
              </li>
            ))}
          </ul>
        </section>
        <section id="status" aria-labelledby="status-heading">
          <h2 id="status-heading">Status</h2>
          <p>
            The repository foundation and the three package builds are in this tree. Grid behavior
            is not.
          </p>
          <ul>
            <li>Core logic stays out of the React package.</li>
            <li>Library modules do not read browser globals while they initialize.</li>
            <li>React and Next.js App Router are the first supported hosts.</li>
            <li>Further framework adapters can sit beside the React package later.</li>
          </ul>
          <p>
            Narrative docs live in the repository as <code>README.md</code>,{' '}
            <code>ARCHITECTURE.md</code>, <code>IMPLEMENTATION_STATUS.md</code>,{' '}
            <code>FEATURE_MATRIX.md</code>, <code>DECISIONS.md</code>, and{' '}
            <code>CONTRIBUTING.md</code>.
          </p>
        </section>
      </main>
    </div>
  );
}
