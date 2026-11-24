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
    children: 'React adapter mount point. Cell rendering is not implemented.',
  },
};

export const WithClassName: Story = {
  args: {
    className: 'story-frame',
    children: 'The class name is forwarded to the root element.',
  },
};
