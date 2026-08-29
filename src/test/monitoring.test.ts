import {
    addBreadcrumb,
    captureException,
    captureMessage,
    clearDiagnostics,
    formatDiagnosticReport,
    getRecentBreadcrumbs,
    getRecentDiagnostics,
    getUserContext,
    initMonitoring,
    setUserContext
} from '@utils/monitoring.util';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Monitoring & Observability Utility', () => {
    beforeEach(() => {
        clearDiagnostics();
    });

    it('initializes monitoring without throwing error in test environment', () => {
        expect(() => initMonitoring()).not.toThrow();
        const breadcrumbs = getRecentBreadcrumbs();
        expect(breadcrumbs.length)
            .toBeGreaterThan(0);
        expect(breadcrumbs[0]?.category)
            .toBe('monitoring');
    });

    it('sets, retrieves, and clears user context correctly', () => {
        expect(getUserContext())
            .toBeNull();

        setUserContext({
            id: 'usr-12345',
            email: 'faculty@arellano.edu.ph',
            role: 'Faculty'
        });

        const context = getUserContext();
        expect(context)
            .toEqual({
                id: 'usr-12345',
                email: 'faculty@arellano.edu.ph',
                role: 'Faculty'
            });

        const breadcrumbs = getRecentBreadcrumbs();
        const authCrumb = breadcrumbs.find((b) => b.category === 'auth');
        expect(authCrumb)
            .toBeDefined();
        expect(authCrumb?.message)
            .toContain('Faculty');

        setUserContext(null);
        expect(getUserContext())
            .toBeNull();
    });

    it('manages breadcrumbs circular buffer within max capacity', () => {
        for (let i = 0; i < 60; i++) {
            addBreadcrumb({
                category: 'navigation',
                message: `Navigated to route ${i}`
            });
        }

        const breadcrumbs = getRecentBreadcrumbs();
        expect(breadcrumbs.length)
            .toBe(50);
        expect(breadcrumbs[breadcrumbs.length - 1]?.message)
            .toBe('Navigated to route 59');
    });

    it('captures standard Error exceptions and generates diagnostic reports', () => {
        const testError = new Error('Database query connection timeout');
        const eventId = captureException(testError, { sectionId: 'sec-999' });

        expect(typeof eventId)
            .toBe('string');
        expect(eventId.startsWith('evt_'))
            .toBe(true);

        const diagnostics = getRecentDiagnostics();
        expect(diagnostics.length)
            .toBe(1);
        expect(diagnostics[0]?.message)
            .toBe('Database query connection timeout');
        expect(diagnostics[0]?.level)
            .toBe('error');
        expect(diagnostics[0]?.stack)
            .toBeDefined();
        expect(diagnostics[0]?.eventId)
            .toBe(eventId);
    });

    it('captures non-Error objects safely', () => {
        const errorObj = { message: 'Unauthorized RPC invocation', code: '42501' };
        const eventId = captureException(errorObj);

        expect(typeof eventId)
            .toBe('string');
        const diagnostics = getRecentDiagnostics();
        expect(diagnostics.length)
            .toBe(1);
        expect(diagnostics[0]?.message)
            .toBe('Unauthorized RPC invocation');
    });

    it('captures informational and warning messages', () => {
        const eventId = captureMessage('Grade sheet sync initiated', 'info', { sectionCode: 'CS101' });

        expect(typeof eventId)
            .toBe('string');
        const diagnostics = getRecentDiagnostics();
        expect(diagnostics.length)
            .toBe(1);
        expect(diagnostics[0]?.level)
            .toBe('info');
        expect(diagnostics[0]?.message)
            .toBe('Grade sheet sync initiated');
    });

    it('formats a structured markdown diagnostic report', () => {
        setUserContext({
            id: 'u-1',
            email: 'admin@arellano.edu.ph',
            role: 'Admin'
        });

        const testError = new Error('Critical transmutation table mismatch');
        captureException(testError);

        const diagnostics = getRecentDiagnostics();
        const report = diagnostics[0];
        expect(report)
            .toBeDefined();

        if (report) {
            const formatted = formatDiagnosticReport(report);
            expect(formatted)
                .toContain('### AU-JAS LMS Diagnostic Incident Report');
            expect(formatted)
                .toContain(report.eventId);
            expect(formatted)
                .toContain('Critical transmutation table mismatch');
            expect(formatted)
                .toContain('Admin');
            expect(formatted)
                .toContain('Recent Breadcrumbs');
        }
    });
});