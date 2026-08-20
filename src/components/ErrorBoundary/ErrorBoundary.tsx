import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

import { ErrorView } from '@/components/ErrorView'
import { reportError } from '@/services'

type ErrorBoundaryProps = { readonly children: ReactNode }
type ErrorBoundaryState = { readonly error: Error | null }

/**
 * The single permitted class in the codebase (guidelines §2.2): React has no
 * hook equivalent for componentDidCatch.
 *
 * Catches render-phase crashes, reports them to Crashlytics, and offers a
 * reset instead of a white screen.
 */
// eslint-disable-next-line no-restricted-syntax
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, `render crash: ${info.componentStack ?? 'no component stack'}`)
  }

  private readonly reset = (): void => {
    this.setState({ error: null })
  }

  override render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <ErrorView
        title="CAPRI hit a problem"
        message="The screen failed to load. This has been reported."
        onRetry={this.reset}
        retryLabel="Reload"
      />
    )
  }
}
