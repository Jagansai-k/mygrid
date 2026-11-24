import { Component, type ErrorInfo, type ReactNode } from 'react';

interface MountErrorBoundaryProps {
  children: ReactNode;
}

interface MountErrorBoundaryState {
  message: string | null;
}

export class MountErrorBoundary extends Component<
  MountErrorBoundaryProps,
  MountErrorBoundaryState
> {
  public override state: MountErrorBoundaryState = { message: null };

  public static getDerivedStateFromError(error: unknown): MountErrorBoundaryState {
    return {
      message: error instanceof Error ? error.message : 'The adapter failed to mount.',
    };
  }

  public override componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('MyGrid mount failed.', error, info.componentStack);
  }

  public override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <p role="alert" className="alert">
          {this.state.message}
        </p>
      );
    }

    return this.props.children;
  }
}
