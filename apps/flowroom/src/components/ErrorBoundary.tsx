import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * A fence around anything non-essential.
 *
 * FlowMe threw in production and took the whole room down with it — a white
 * screen on a URL that had already been sent to a client. React unmounts the
 * entire tree when a render throws, so a guide, a panel or a decoration is
 * enough to destroy the proposal.
 *
 * Wrap the extras in this and the worst case becomes "one small thing is
 * missing" instead of "there is no page". The error is shown rather than
 * swallowed, because a silent failure is how the first one went unnoticed.
 */
interface Props {
  children: ReactNode;
  /** Shown in the fallback so it is obvious which part failed. */
  label: string;
}
interface State {
  message: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { message: null };

  static getDerivedStateFromError(error: Error): State {
    return { message: error?.message ?? 'unknown error' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[flowroom] ${this.props.label} failed`, error, info.componentStack);
  }

  render() {
    if (this.state.message === null) return this.props.children;
    return (
      <div
        className="t-mono fixed bottom-16 left-4 z-50 max-w-[18rem] px-3 py-2 leading-relaxed md:bottom-5 md:left-5"
        style={{ background: 'rgb(13 7 22 / 0.92)', border: '1px solid var(--rose)', color: 'var(--rose)' }}
        role="status"
      >
        {this.props.label} unavailable
      </div>
    );
  }
}
