import { DiagnosticReport, MonitoringBreadcrumb, MonitoringUserContext, SeverityLevel } from '@type/monitoring.type';
import { parseServiceError } from '@utils/error.util';

const MAX_BREADCRUMBS = 50;
const MAX_DIAGNOSTIC_REPORTS = 20;

let currentUserContext: MonitoringUserContext | null = null;
const breadcrumbsBuffer: MonitoringBreadcrumb[] = [];
const diagnosticReportsBuffer: DiagnosticReport[] = [];
let isInitialized = false;

function generateEventId(): string {
    return 'evt_' + Math.random()
        .toString(36)
        .substring(2, 11) + Date.now()
        .toString(36);
}

function resolveMetadata(): DiagnosticReport['metadata'] {
    const isBrowser = typeof window !== 'undefined';
    return {
        url: isBrowser
            ? window.location.href
            : 'server-or-test',
        userAgent: isBrowser
            ? window.navigator.userAgent
            : 'node-environment',
        screenResolution: isBrowser
            ? `${window.innerWidth}x${window.innerHeight}`
            : '0x0',
        environment: import.meta.env.MODE || 'development'
    };
}

/**
 * Initializes client-side monitoring and registers global unhandled error handlers.
 */
export function initMonitoring(): void {
    if (isInitialized || typeof window === 'undefined') {
        return;
    }

    const sentryDsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

    if (sentryDsn && sentryDsn.trim().length > 0) {
        addBreadcrumb({
            category: 'monitoring',
            message: 'Sentry observability initialized with remote DSN target',
            level: 'info'
        });
    }
    else {
        addBreadcrumb({
            category: 'monitoring',
            message: 'In-memory telemetry and error diagnostics initialized (local fallback)',
            level: 'info'
        });
    }

    window.addEventListener('error', (event: ErrorEvent) => {
        captureException(event.error || event.message, {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            source: 'window.onerror'
        });
    });

    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
        captureException(event.reason, {
            source: 'window.unhandledrejection'
        });
    });

    isInitialized = true;
}

/**
 * Sets the active user context for telemetry and error tracking.
 */
export function setUserContext(user: MonitoringUserContext | null): void {
    currentUserContext = user;
    if (user) {
        addBreadcrumb({
            category: 'auth',
            message: `User context updated for role: ${user.role || 'Unspecified'}`,
            data: { userId: user.id, role: user.role }
        });
    }
    else {
        addBreadcrumb({
            category: 'auth',
            message: 'User context cleared',
            level: 'info'
        });
    }
}

/**
 * Retrieves the currently attached user context.
 */
export function getUserContext(): MonitoringUserContext | null {
    return currentUserContext;
}

/**
 * Adds a breadcrumb event to the in-memory circular buffer.
 */
export function addBreadcrumb(
    crumb: Omit<MonitoringBreadcrumb, 'timestamp'> & { timestamp?: string }
): void {
    const timestampedCrumb: MonitoringBreadcrumb = {
        category: crumb.category,
        message: crumb.message,
        data: crumb.data,
        level: crumb.level || 'info',
        timestamp: crumb.timestamp || new Date()
            .toISOString()
    };

    if (breadcrumbsBuffer.length >= MAX_BREADCRUMBS) {
        breadcrumbsBuffer.shift();
    }
    breadcrumbsBuffer.push(timestampedCrumb);
}

/**
 * Returns a copy of recent breadcrumbs.
 */
export function getRecentBreadcrumbs(): MonitoringBreadcrumb[] {
    return [...breadcrumbsBuffer];
}

/**
 * Captures an exception with stack and contextual metadata.
 * Returns the unique event ID.
 */
export function captureException(
    error: unknown,
    context?: Record<string, unknown>
): string {
    const eventId = generateEventId();
    const parsed = parseServiceError(error);
    const stack = error instanceof Error
        ? error.stack
        : undefined;
    const message = parsed.message || 'Unknown runtime error';

    const report: DiagnosticReport = {
        eventId,
        timestamp: new Date()
            .toISOString(),
        message,
        stack,
        level: 'error',
        user: currentUserContext,
        breadcrumbs: getRecentBreadcrumbs(),
        metadata: {
            ...resolveMetadata(),
            ...(context
                ? { contextJson: JSON.stringify(context) }
                : {})
        }
    };

    if (diagnosticReportsBuffer.length >= MAX_DIAGNOSTIC_REPORTS) {
        diagnosticReportsBuffer.shift();
    }
    diagnosticReportsBuffer.push(report);

    addBreadcrumb({
        category: 'exception',
        message: `Exception captured: ${message}`,
        data: { eventId, ...context },
        level: 'error'
    });

    return eventId;
}

/**
 * Captures an informational or warning telemetry message.
 * Returns the unique event ID.
 */
export function captureMessage(
    message: string,
    level: SeverityLevel = 'info',
    context?: Record<string, unknown>
): string {
    const eventId = generateEventId();

    const report: DiagnosticReport = {
        eventId,
        timestamp: new Date()
            .toISOString(),
        message,
        level,
        user: currentUserContext,
        breadcrumbs: getRecentBreadcrumbs(),
        metadata: {
            ...resolveMetadata(),
            ...(context
                ? { contextJson: JSON.stringify(context) }
                : {})
        }
    };

    if (diagnosticReportsBuffer.length >= MAX_DIAGNOSTIC_REPORTS) {
        diagnosticReportsBuffer.shift();
    }
    diagnosticReportsBuffer.push(report);

    addBreadcrumb({
        category: 'message',
        message,
        data: { eventId, ...context },
        level
    });

    return eventId;
}

/**
 * Retrieves the list of recent diagnostic incident reports.
 */
export function getRecentDiagnostics(): DiagnosticReport[] {
    return [...diagnosticReportsBuffer];
}

/**
 * Clears in-memory buffers (primarily used in automated test suites).
 */
export function clearDiagnostics(): void {
    breadcrumbsBuffer.length = 0;
    diagnosticReportsBuffer.length = 0;
    currentUserContext = null;
}

/**
 * Formats a diagnostic incident report into structured Markdown for user copying or bug reports.
 */
export function formatDiagnosticReport(report: DiagnosticReport): string {
    return [
        '### AU-JAS LMS Diagnostic Incident Report',
        `- **Event ID**: \`${report.eventId}\``,
        `- **Timestamp**: ${report.timestamp}`,
        `- **Severity**: ${report.level.toUpperCase()}`,
        `- **Message**: ${report.message}`,
        `- **User Role**: ${report.user?.role || 'Guest / Unauthenticated'}`,
        `- **URL**: ${report.metadata.url}`,
        `- **Environment**: ${report.metadata.environment}`,
        report.stack
            ? `\n#### Stack Trace\n\`\`\`\n${report.stack}\n\`\`\``
            : '',
        '\n#### Recent Breadcrumbs',
        report.breadcrumbs.slice(-5)
            .map((b) => `- [${b.timestamp}] [${b.category}] ${b.message}`)
            .join('\n')
    ].filter(Boolean)
        .join('\n');
}