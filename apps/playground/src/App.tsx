import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import { MYGRID_REACT_VERSION, MyGrid } from '@inno-grid/mygrid-react';
import { MYGRID_THEMES_VERSION, themeTokens } from '@inno-grid/mygrid-themes';
import { MountErrorBoundary } from './mount-error-boundary';
import { TokenValue } from './token-value';

const packages = [
  {
    name: '@inno-grid/mygrid-core',
    version: MYGRID_CORE_VERSION,
    role: 'Framework-independent TypeScript. No React, and no DOM types.',
  },
  {
    name: '@inno-grid/mygrid-react',
    version: MYGRID_REACT_VERSION,
    role: 'Client component and the React adapter. Grid rendering does not live here.',
  },
  {
    name: '@inno-grid/mygrid-themes',
    version: MYGRID_THEMES_VERSION,
    role: 'Opt-in stylesheet and the names of the base theme tokens.',
  },
] as const;

const notStarted = [
  'Column and row models',
  'Cell rendering',
  'Sorting, filtering, and selection',
  'Editing',
  'Virtualization',
  'Keyboard grid navigation',
] as const;

export function App() {
  return (
    <div className="app">
      <a className="skip" href="#content">
        Skip to content
      </a>
      <header className="top">
        <div className="brand">
          <span className="mark" aria-hidden="true">
            Mg
          </span>
          <div>
            <p className="eyebrow">inno-grid</p>
            <p className="brand-name">{MYGRID_LIBRARY_NAME}</p>
          </div>
        </div>
        <p className="pill">Foundation</p>
      </header>
      <main id="content">
        <section className="hero" aria-labelledby="page-title">
          <h1 id="page-title">MyGrid playground</h1>
          <p className="lede">
            A development shell for the company-owned MyGrid library. It mounts the React adapter
            and loads the base theme. It does not render rows, columns, or cells.
          </p>
        </section>
        <div className="layout">
          <section className="panel" aria-labelledby="packages-heading">
            <h2 id="packages-heading">Packages</h2>
            <ul className="package-list">
              {packages.map((pkg) => (
                <li key={pkg.name}>
                  <p className="package-name">{pkg.name}</p>
                  <p className="package-version">{pkg.version}</p>
                  <p>{pkg.role}</p>
                </li>
              ))}
            </ul>
          </section>
          <section className="panel stage" aria-labelledby="mount-heading">
            <h2 id="mount-heading">Mount</h2>
            <MountErrorBoundary>
              <MyGrid className="mount">
                <p className="kicker">React adapter</p>
                <p>
                  <code>MyGrid</code> is mounted. Children render inside the root element. There is
                  no column model and no row model behind this node.
                </p>
              </MyGrid>
            </MountErrorBoundary>
          </section>
          <section className="panel" aria-labelledby="tokens-heading">
            <h2 id="tokens-heading">Theme tokens</h2>
            <p>Values read from the base stylesheet after it loads.</p>
            <dl className="tokens">
              {Object.entries(themeTokens).map(([key, token]) => (
                <div key={token}>
                  <dt>
                    {key}
                    <code>{token}</code>
                  </dt>
                  <dd>
                    <TokenValue name={token} />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
        <section className="panel absent" aria-labelledby="absent-heading">
          <h2 id="absent-heading">Not in this build</h2>
          <ul>
            {notStarted.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
      <footer>
        <p>
          MyGrid is an independent library. It does not include AG Grid source, assets, or branding.
        </p>
      </footer>
    </div>
  );
}
