# Getting started

## Install

```bash
pnpm install
pnpm build
```

Node.js 22 or newer is required. The root `package.json` pins pnpm 10.33.4.

## Run a host

| Host            | Command                   | Port |
| --------------- | ------------------------- | ---- |
| Playground      | `pnpm dev:playground`     | 4183 |
| Docs site       | `pnpm dev:docs`           | 4184 |
| Storybook       | `pnpm dev:storybook`      | 6008 |
| React example   | `pnpm dev:example-react`  | 4185 |
| Next.js example | `pnpm dev:example-nextjs` | 4186 |

`pnpm dev` starts the playground and the docs site together.

## Use the packages in an application

Install the three packages from the workspace, or later from npm once they are published. Import the stylesheet yourself, then render the mount:

```tsx
import '@inno-grid/mygrid-themes/theme.css';
import { MyGrid } from '@inno-grid/mygrid-react';

export function Example() {
  return (
    <MyGrid>
      <p>Adapter mounted.</p>
    </MyGrid>
  );
}
```

In the Next.js App Router, a Server Component may import `MyGrid` directly. The package entry is a client module. Import `@inno-grid/mygrid-core` from server code when you only need the framework-free API. The Next.js sample in `examples/nextjs` shows that split.

`MyGrid` does not accept row data or column definitions yet. Those APIs are not part of the foundation.
