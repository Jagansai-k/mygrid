import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import type { ColumnDefinition } from '@inno-grid/mygrid-core';
import { MyGrid } from '@inno-grid/mygrid-react';

interface Person {
  id: string;
  name: string;
  department: string;
}

const columns: ColumnDefinition<Person>[] = [
  { field: 'name', headerName: 'Name', sortable: true, filterable: true },
  { field: 'department', headerName: 'Department', sortable: true, filterable: true },
];

const rows: Person[] = [
  { id: '1', name: 'Ada Lovelace', department: 'Engineering' },
  { id: '2', name: 'Grace Hopper', department: 'Research' },
  { id: '3', name: 'Alan Turing', department: 'Engineering' },
];

export default function Page() {
  return (
    <main>
      <p className="eyebrow">examples/nextjs</p>
      <h1>Next.js App Router</h1>
      <p>
        This page is a Server Component. It read <code>{MYGRID_LIBRARY_NAME}</code> core version{' '}
        <strong>{MYGRID_CORE_VERSION}</strong> while rendering on the server. <code>MyGrid</code> is
        imported from the React package, whose entry is a client boundary. The column and row values
        below are plain data, so the server can pass them to that client component.
      </p>
      <MyGrid<Person>
        columnDefs={columns}
        rowData={rows}
        pagination={{ enabled: true, pageSize: 2, pageSizeOptions: [2, 5] }}
        height="16rem"
        label="People"
      />
      <MyGrid className="example-mount" theme="dark" density="compact">
        <p>Dark theme and compact density travel as props from this Server Component.</p>
      </MyGrid>
    </main>
  );
}
