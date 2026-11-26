import { useMemo, useState } from 'react';
import type { ColumnDefinition } from '@inno-grid/mygrid-core';
import type { MyGridVirtualMetrics } from '@inno-grid/mygrid-react';
import { MyGrid } from '@inno-grid/mygrid-react';
import type { LiveExampleId } from './content/types';

interface Employee {
  id: string;
  name: string;
  department: string;
  salary: number;
}

const employees: Employee[] = [
  { id: '1', name: 'Ada Lovelace', department: 'Engineering', salary: 90000 },
  { id: '2', name: 'Grace Hopper', department: 'Research', salary: 120000 },
  { id: '3', name: 'Alan Turing', department: 'Engineering', salary: 110000 },
  { id: '4', name: 'Edsger Dijkstra', department: 'Research', salary: 100000 },
  { id: '5', name: 'Barbara Liskov', department: 'Design', salary: 80000 },
];

const columns: ColumnDefinition<Employee>[] = [
  {
    field: 'name',
    headerName: 'Name',
    sortable: true,
    filterable: true,
    pinned: 'left',
    width: 180,
  },
  { field: 'department', headerName: 'Department', sortable: true, filterable: true, width: 160 },
  { field: 'salary', headerName: 'Salary', sortable: true, filterable: true, width: 120 },
];

const paging = { enabled: true, pageSize: 3, pageSizeOptions: [3, 5] };

export function LiveExample({ id }: { readonly id: LiveExampleId }) {
  switch (id) {
    case 'employee':
      return (
        <MyGrid<Employee>
          columnDefs={columns}
          rowData={employees}
          height="18rem"
          label="Employees"
        />
      );
    case 'sorting':
      return (
        <MyGrid<Employee>
          columnDefs={columns}
          rowData={employees}
          height="18rem"
          label="Sortable employees"
        />
      );
    case 'filtering':
      return (
        <MyGrid<Employee>
          columnDefs={columns}
          rowData={employees}
          numberFilterColumns={['salary']}
          height="22rem"
          label="Filterable employees"
        />
      );
    case 'pagination':
      return (
        <MyGrid<Employee>
          columnDefs={columns}
          rowData={employees}
          pagination={paging}
          height="18rem"
          label="Paged employees"
        />
      );
    case 'selection':
      return (
        <MyGrid<Employee>
          columnDefs={columns}
          rowData={employees}
          selection={{ mode: 'multiple' }}
          height="18rem"
          label="Selectable employees"
        />
      );
    case 'dark':
      return (
        <MyGrid<Employee>
          columnDefs={columns}
          rowData={employees}
          theme="dark"
          density="compact"
          height="18rem"
          label="Dark employees"
        />
      );
    case 'large':
      return <LargeGrid />;
    default: {
      const unreachable: never = id;
      return unreachable;
    }
  }
}

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
    width: 160,
  },
  { field: 'score', headerName: 'Score', sortable: true, filterable: true, width: 120 },
  ...Array.from({ length: 8 }, (_, index) => ({
    field: 'department' as const,
    colId: `extra-${String(index)}`,
    headerName: `Column ${String(index + 1)}`,
    width: 140,
  })),
  { field: 'note', headerName: 'Note', pinned: 'right', width: 140 },
];

function LargeGrid() {
  const rows = useMemo(() => volumeRows(1000), []);
  const [metrics, setMetrics] = useState<MyGridVirtualMetrics | null>(null);
  return (
    <div className="live-stack">
      <p className="metrics" role="status">
        {metrics === null
          ? 'Measuring the mounted window.'
          : `Rows ${String(metrics.renderedRows)} of ${String(metrics.totalRows)}. Columns ${String(metrics.renderedColumns)} of ${String(metrics.totalColumns)}.`}
      </p>
      <MyGrid<VolumeRow>
        columnDefs={volumeColumns}
        rowData={rows}
        pagination={{ enabled: false, pageSize: 100, pageSizeOptions: [100] }}
        height="22rem"
        label="Large dataset"
        onVirtualMetrics={setMetrics}
      />
    </div>
  );
}

function volumeRows(count: number): VolumeRow[] {
  const departments = ['Research', 'Engineering', 'Design'];
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
