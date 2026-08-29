export type SeverityLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export interface MonitoringUserContext {
    id: string;
    email?: string;
    role?: string;
}

export interface MonitoringBreadcrumb {
    category: string;
    message: string;
    data?: Record<string, unknown>;
    level?: SeverityLevel;
    timestamp?: string;
}

export interface MonitoringEventContext {
    user?: MonitoringUserContext | null;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    breadcrumbs?: MonitoringBreadcrumb[];
}

export interface DiagnosticReport {
    eventId: string;
    timestamp: string;
    message: string;
    stack?: string;
    level: SeverityLevel;
    user: MonitoringUserContext | null;
    breadcrumbs: MonitoringBreadcrumb[];
    metadata: {
        url: string;
        userAgent: string;
        screenResolution: string;
        environment: string;
    };
}