import { useCallback, useMemo, useState } from 'react';
import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import type { ColumnDefinition } from '@inno-grid/mygrid-core';
import type { MyGridDensity, MyGridTheme, MyGridVirtualMetrics } from '@inno-grid/mygrid-react';
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
    role: 'Client component. Renders a virtualized window over the core grid.',
  },
  {
    name: '@inno-grid/mygrid-themes',
    version: MYGRID_THEMES_VERSION,
    role: 'Opt-in light, dark, and density stylesheets. The React package does not import them.',
  },
] as const;

const notStarted = [
  'Advanced column resizing and reordering',
  'Cell editing and validation',
  'Advanced keyboard navigation',
  'Server-side row model',
  'Infinite scrolling',
  'Row grouping and aggregation',
  'Pivoting',
  'Clipboard and Excel export',
] as const;

interface Staff {
  id: string;
  name: string;
  department: string;
  role: string;
  salary: number;
}

const staff: Staff[] = [
  { id: '1', name: 'Grace Hopper', department: 'Research', role: 'Compiler', salary: 120000 },
  { id: '2', name: 'Ada Lovelace', department: 'Engineering', role: 'Analyst', salary: 90000 },
  {
    id: '3',
    name: 'Alan Turing',
    department: 'Engineering',
    role: 'Cryptographer',
    salary: 110000,
  },
  { id: '4', name: 'Edsger Dijkstra', department: 'Research', role: 'Professor', salary: 100000 },
  { id: '5', name: 'Barbara Liskov', department: 'Design', role: 'Architect', salary: 80000 },
  { id: '6', name: 'Donald Knuth', department: 'Research', role: 'Author', salary: 130000 },
  { id: '7', name: 'Margaret Hamilton', department: 'Engineering', role: 'Lead', salary: 125000 },
  {
    id: '8',
    name: 'Katherine Johnson',
    department: 'Research',
    role: 'Mathematician',
    salary: 95000,
  },
  { id: '9', name: 'Tim Berners-Lee', department: 'Engineering', role: 'Inventor', salary: 115000 },
  { id: '10', name: 'Radia Perlman', department: 'Engineering', role: 'Network', salary: 105000 },
  { id: '11', name: 'Frances Allen', department: 'Research', role: 'Compiler', salary: 98000 },
  { id: '12', name: 'Sophie Wilson', department: 'Design', role: 'Processor', salary: 102000 },
];

const staffColumns: ColumnDefinition<Staff>[] = [
  {
    field: 'name',
    headerName: 'Name',
    sortable: true,
    filterable: true,
    pinned: 'left',
    width: 180,
  },
  { field: 'department', headerName: 'Department', sortable: true, filterable: true, width: 160 },
  { field: 'role', headerName: 'Role', sortable: true, filterable: true, width: 160 },
  { field: 'salary', headerName: 'Salary', sortable: true, filterable: true, width: 120 },
];

const staffPage = { enabled: true, pageSize: 5, pageSizeOptions: [5, 10, 25] };

interface VolumeRow {
  id: string;
  name: string;
  department: string;
  score: number;
  note: string;
}

const volumeColumns: ColumnDefinition<VolumeRow>[] = [
  {
    field: 'name',
    headerName: 'Name',
    sortable: true,
    filterable: true,
    pinned: 'left',
    width: 180,
  },
  {
    field: 'score',
    headerName: 'Score',
    sortable: true,
    filterable: true,
    width: 120,
  },
  ...Array.from({ length: 18 }, (_, index) => ({
    field: 'department' as const,
    colId: `extra-${String(index)}`,
    headerName: `Column ${String(index + 1)}`,
    width: 140,
  })),
  { field: 'note', headerName: 'Note', pinned: 'right', width: 180 },
];

type DatasetId = 'staff' | '1000' | '10000' | '50000' | '100000';

const datasetChoices: readonly { id: DatasetId; label: string }[] = [
  { id: 'staff', label: 'Staff sample' },
  { id: '1000', label: '1,000 rows' },
  { id: '10000', label: '10,000 rows' },
  { id: '50000', label: '50,000 rows' },
  { id: '100000', label: '100,000 rows' },
];

function volumeRows(count: number): VolumeRow[] {
  const departments = ['Research', 'Engineering', 'Design', 'Platform'];
  const data: VolumeRow[] = [];
  for (let index = 0; index < count; index += 1) {
    data.push({
      id: String(index),
      name: `Person ${String(index)}`,
      department: departments[index % departments.length] ?? 'Research',
      score: index % 1000,
      note: `Note ${String(index)}`,
    });
  }
  return data;
}

const emptyMetrics: MyGridVirtualMetrics = {
  totalRows: 0,
  renderedRows: 0,
  totalColumns: 0,
  renderedColumns: 0,
  scrollTop: 0,
  scrollLeft: 0,
};

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
  const [dataset, setDataset] = useState<DatasetId>('staff');
  const [metrics, setMetrics] = useState<MyGridVirtualMetrics>(emptyMetrics);
  const onVirtualMetrics = useCallback((next: MyGridVirtualMetrics) => {
    setMetrics(next);
  }, []);
  const volumeCount = dataset === 'staff' ? 0 : Number(dataset);
  const rows = useMemo(() => volumeRows(volumeCount), [volumeCount]);
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
        <p className="pill">v1</p>
      </header>
      <main id="content">
        <section className="hero" aria-labelledby="page-title">
          <h1 id="page-title">MyGrid playground</h1>
          <p className="lede">
            A development shell for the company-owned MyGrid library. The staff sample sorts,
            filters, pages, and selects through the core engine. Larger datasets mount only the rows
            and columns in the scroll window.
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
            <h2 id="mount-heading">Staff grid</h2>
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
            <label className="dataset-field">
              Dataset
              <select
                aria-label="Dataset"
                value={dataset}
                onChange={(event) => {
                  setDataset(event.target.value as DatasetId);
                }}
              >
                {datasetChoices.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="metrics" role="status">
              {`Rows ${String(metrics.renderedRows)} of ${String(metrics.totalRows)}. Columns ${String(metrics.renderedColumns)} of ${String(metrics.totalColumns)}. Scroll ${String(metrics.scrollTop)}, ${String(metrics.scrollLeft)}.`}
            </p>
            <MountErrorBoundary>
              {dataset === 'staff' ? (
                <MyGrid<Staff>
                  key="staff"
                  className="mount"
                  theme={theme}
                  density={density}
                  columnDefs={staffColumns}
                  rowData={staff}
                  pagination={staffPage}
                  numberFilterColumns={['salary']}
                  height="28rem"
                  label="Staff"
                  onVirtualMetrics={onVirtualMetrics}
                />
              ) : (
                <MyGrid<VolumeRow>
                  key={dataset}
                  className="mount"
                  theme={theme}
                  density={density}
                  columnDefs={volumeColumns}
                  rowData={rows}
                  pagination={{ enabled: false, pageSize: 100, pageSizeOptions: [100] }}
                  numberFilterColumns={['score']}
                  height="28rem"
                  label="Volume"
                  onVirtualMetrics={onVirtualMetrics}
                />
              )}
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
          <h2 id="absent-heading">Planned for v2</h2>
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
