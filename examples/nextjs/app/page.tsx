import { MYGRID_CORE_VERSION, MYGRID_LIBRARY_NAME } from '@inno-grid/mygrid-core';
import { MyGrid } from '@inno-grid/mygrid-react';

export default function Page() {
  return (
    <main>
      <p className="eyebrow">examples/nextjs</p>
      <h1>Next.js App Router</h1>
      <p>
        This page is a Server Component. It read <code>{MYGRID_LIBRARY_NAME}</code> core version{' '}
        <strong>{MYGRID_CORE_VERSION}</strong> while rendering on the server. <code>MyGrid</code> is
        imported from the React package, whose entry is a client boundary.
      </p>
      <MyGrid>
        <p>The data grid is not implemented. This only mounts the adapter.</p>
      </MyGrid>
      <MyGrid className="example-mount" theme="dark" density="compact">
        <p>Dark theme and compact density travel as props from this Server Component.</p>
      </MyGrid>
    </main>
  );
}
