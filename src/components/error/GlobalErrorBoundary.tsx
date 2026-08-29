import CommonButton from '@components/button/CommonButton';
import { ArrowClockwiseIcon, CopyIcon, HouseIcon, WarningOctagonIcon } from '@phosphor-icons/react';
import { captureException, formatDiagnosticReport, getRecentDiagnostics } from '@utils/monitoring.util';
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    eventId: string | null;
    copied: boolean;
}

export default class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            eventId: null,
            copied: false
        };
    }

    static getDerivedStateFromError(error: Error): Partial<State> {
        return {
            hasError: true,
            error
        };
    }

    override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        const eventId = captureException(error, {
            componentStack: errorInfo.componentStack || undefined
        });
        this.setState({ eventId });
    }

    handleReload = (): void => {
        window.location.reload();
    };

    handleGoHome = (): void => {
        window.location.href = '/login';
    };

    handleCopyDiagnostics = async(): Promise<void> => {
        const diagnostics = getRecentDiagnostics();
        const latest = diagnostics[diagnostics.length - 1];
        if (latest) {
            const formatted = formatDiagnosticReport(latest);
            try {
                await navigator.clipboard.writeText(formatted);
                this.setState({ copied: true });
                setTimeout(() => {
                    this.setState({ copied: false });
                }, 3000);
            }
            catch {
                // Clipboard write fallback
            }
        }
    };

    override render(): ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex flex-col gap-4 h-screen items-center justify-center p-6 text-center w-full bg-(--mui-palette-background-default)">
                    <WarningOctagonIcon
                        className="text-(--mui-palette-error-main)"
                        size={64}
                        weight="duotone"
                    />
                    <h1 className="font-bold text-(--mui-palette-text-primary) text-3xl">
                        Application Error
                    </h1>
                    <p className="max-w-md text-(--mui-palette-text-secondary) text-sm">
                        An unexpected runtime error interrupted the application. Our observability system has captured this incident.
                    </p>

                    {this.state.eventId && (
                        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex items-center gap-2 px-3 py-1.5 rounded text-xs font-mono text-(--mui-palette-text-secondary)">
                            <span>Incident ID:</span>
                            <span className="font-semibold text-(--mui-palette-text-primary)">
                                {this.state.eventId}
                            </span>
                        </div>
                    )}

                    {this.state.error?.message && (
                        <details className="max-w-lg text-left w-full bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) p-3 rounded">
                            <summary className="cursor-pointer font-medium text-(--mui-palette-text-secondary) text-xs">
                                View Technical Error Message
                            </summary>
                            <p className="break-words font-mono mt-2 text-(--mui-palette-error-main) text-xs">
                                {this.state.error.message}
                            </p>
                        </details>
                    )}

                    <div className="flex flex-wrap gap-2 justify-center mt-2">
                        <CommonButton
                            startIcon={<ArrowClockwiseIcon size={16} weight="bold" />}
                            variant="outlined"
                            onClick={this.handleReload}
                        >
                            Reload Application
                        </CommonButton>
                        <CommonButton
                            startIcon={<CopyIcon size={16} weight="bold" />}
                            variant="outlined"
                            onClick={this.handleCopyDiagnostics}
                        >
                            {this.state.copied
                                ? 'Copied to Clipboard!'
                                : 'Copy Incident Report'}
                        </CommonButton>
                        <CommonButton
                            startIcon={<HouseIcon size={16} weight="bold" />}
                            variant="contained"
                            onClick={this.handleGoHome}
                        >
                            Return to Sign In
                        </CommonButton>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}