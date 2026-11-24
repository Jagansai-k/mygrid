import { useState } from 'react';
import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import type { MyGridDensity, MyGridTheme } from '@inno-grid/mygrid-react';
import { MYGRID_REACT_VERSION, MyGrid } from '@inno-grid/mygrid-react';
import { MYGRID_THEMES_VERSION, themeTokens } from '@inno-grid/mygrid-themes';
import { describeConsumer } from './package-consumer';
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
    role: 'Opt-in light, dark, and density stylesheets. The React package does not import them.',
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

const themeChoices: readonly { id: MyGridTheme; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

const densityChoices: readonly { id: MyGridDensity; label: string }[] = [
  { id: 'compact', label: 'Compact' },
  { id: 'default', label: 'Default' },
  { id: 'comfortable', label: 'Comfortable' },
];

export function App() {
  const [theme, setTheme] = useState<MyGridTheme>('light');
  const [density, setDensity] = useState<MyGridDensity>('default');
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
            <div className="choices" role="group" aria-label="Theme">
              {themeChoices.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={theme === option.id}
                  onClick={() => {
                    setTheme(option.id);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="choices" role="group" aria-label="Density">
              {densityChoices.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={density === option.id}
                  onClick={() => {
                    setDensity(option.id);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <MountErrorBoundary>
              <MyGrid className="mount" theme={theme} density={density}>
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
            <p>
              Values read from the document root. The mount uses the selected theme and density.
            </p>
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
      <footer data-consumer={describeConsumer()}>
        <p>
          MyGrid is an independent library. It does not include AG Grid source, assets, or branding.
        </p>
      </footer>
    </div>
  );
}
