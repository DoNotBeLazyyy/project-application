import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import React from 'react';
import { afterEach, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

// Mock window.matchMedia for JSDOM
if (typeof window !== 'undefined' && !window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn()
            .mockImplementation((query: string) => ({
                matches: false,
                media: query,
                onchange: null,
                addListener: vi.fn(),
                removeListener: vi.fn(),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn(),
                dispatchEvent: vi.fn()
            }))
    });
}

// Mock Phosphor Icons for smooth JSDOM execution
vi.mock('@phosphor-icons/react', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@phosphor-icons/react')>();
    return {
        ...actual,
        ClockIcon: (props: Record<string, unknown>) =>
            React.createElement('span', { 'data-testid': 'clock-icon', ...props }),
        ArrowLeftIcon: (props: Record<string, unknown>) =>
            React.createElement('span', { 'data-testid': 'arrow-left-icon', ...props }),
        ArrowRightIcon: (props: Record<string, unknown>) =>
            React.createElement('span', { 'data-testid': 'arrow-right-icon', ...props }),
        CaretDownIcon: (props: Record<string, unknown>) =>
            React.createElement('span', { 'data-testid': 'caret-down-icon', ...props }),
        CheckCircleIcon: (props: Record<string, unknown>) =>
            React.createElement('span', { 'data-testid': 'check-circle-icon', ...props })
    };
});