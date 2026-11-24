import { MyGrid } from '@inno-grid/mygrid-react';

export function App() {
  return (
    <main>
      <p className="eyebrow">examples/react</p>
      <h1>React example</h1>
      <p>
        This app depends on the package entry points, the same way an application outside the
        repository would. It imports <code>@inno-grid/mygrid-react</code> and the theme stylesheet.
      </p>
      <MyGrid>
        <p>Adapter mounted. The data grid is not implemented.</p>
      </MyGrid>
    </main>
  );
}
