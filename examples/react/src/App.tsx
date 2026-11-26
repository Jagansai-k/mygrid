import { useState } from 'react';
import { MyGrid } from '@inno-grid/mygrid-react';

interface Person {
  id: string;
  name: string;
  department: string;
}

const columns = [
  { field: 'name' as const, headerName: 'Name', sortable: true, filterable: true },
  { field: 'department' as const, headerName: 'Department', sortable: true, filterable: true },
];

const rows: Person[] = [
  { id: '1', name: 'Ada Lovelace', department: 'Engineering' },
  { id: '2', name: 'Grace Hopper', department: 'Research' },
  { id: '3', name: 'Alan Turing', department: 'Engineering' },
];

export function App() {
  const [selected, setSelected] = useState(0);
  return (
    <main>
      <p className="eyebrow">examples/react</p>
      <h1>React example</h1>
      <p>
        This app depends on the package entry points. <code>onGridReady</code> receives the core{' '}
        <code>GridApi</code>. Sorting, filtering, paging, and selection stay in that API.
      </p>
      <MyGrid<Person>
        columnDefs={columns}
        rowData={rows}
        pagination={{ enabled: true, pageSize: 2, pageSizeOptions: [2, 5] }}
        height="16rem"
        onSelectionChanged={(event) => {
          setSelected(event.api.getSelectedRowIds().length);
        }}
      />
      <p>{selected} selected</p>
      <MyGrid className="example-mount" theme="dark" density="compact">
        <p>Without column definitions, the root still renders children only.</p>
      </MyGrid>
    </main>
  );
}
