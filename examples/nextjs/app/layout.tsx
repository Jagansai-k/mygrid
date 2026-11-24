import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@inno-grid/mygrid-themes/theme.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'MyGrid Next.js example',
  description: 'App Router example that mounts the MyGrid React adapter.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
