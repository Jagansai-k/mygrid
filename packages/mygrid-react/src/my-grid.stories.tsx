import type { Meta, StoryObj } from '@storybook/react-vite';
import { MyGrid } from './my-grid';

const meta = {
  title: 'MyGrid/MyGrid',
  component: MyGrid,
  tags: ['autodocs'],
} satisfies Meta<typeof MyGrid>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Mounted: Story = {
  args: {
    children: 'Without column definitions, MyGrid renders children and no table.',
  },
};

export const WithClassName: Story = {
  args: {
    className: 'story-frame',
    children: 'The class name is forwarded to the root element.',
  },
};

export const DarkCompact: Story = {
  args: {
    theme: 'dark',
    density: 'compact',
    children: 'Dark theme and compact density.',
  },
};

export const WithRows: Story = {
  render: () => (
    <MyGrid<{ id: string; name: string; department: string }>
      columnDefs={[
        { field: 'name', headerName: 'Name', sortable: true, filterable: true },
        { field: 'department', headerName: 'Department', sortable: true },
      ]}
      rowData={[
        { id: '1', name: 'Ada', department: 'Engineering' },
        { id: '2', name: 'Grace', department: 'Research' },
      ]}
      height={280}
      pagination={{ enabled: true, pageSize: 10, pageSizeOptions: [10, 25, 50, 100] }}
    />
  ),
};
