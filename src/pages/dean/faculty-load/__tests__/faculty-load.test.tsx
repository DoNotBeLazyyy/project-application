import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { isChunkLoadError } from '@utils/lazy.util';

vi.mock('@services/faculty-load.service', () => ({
    listFacultyLoad: vi.fn().mockResolvedValue({
        data: {
            content: [
                {
                    id: 'fac-1',
                    faculty_name: 'Dr. Jane Smith',
                    email: 'jane@example.com',
                    section_count: 2,
                    total_units: 6,
                    weekly_hours: 6,
                    student_count: 50,
                    conflict_count: 0
                }
            ],
            number: 0,
            size: 20,
            totalElements: 1,
            totalPages: 1
        }
    }),
    getFacultyLoadDetail: vi.fn().mockResolvedValue({
        data: {
            faculty: {
                id: 'fac-1',
                faculty_name: 'Dr. Jane Smith',
                email: 'jane@example.com'
            },
            assigned_sections: [
                {
                    id: 'sec-1',
                    section_id: 'sec-1',
                    section_code: 'SEC-101',
                    course_code: 'CS101',
                    course_title: 'Intro to CS',
                    units: 3,
                    term_label: '1st Sem AY 2026-2027',
                    max_slots: 40,
                    enrolled_count: 25,
                    status: 'Open',
                    schedules: []
                }
            ],
            conflicts: []
        }
    }),
    saveFacultyLoadAssignments: vi.fn().mockResolvedValue({ data: { success: true } })
}));

vi.mock('@services/term/term.service', () => ({
    getActiveTerm: vi.fn().mockResolvedValue({
        data: { term_id: 'term-1', school_year_id: 'sy-1' }
    })
}));

vi.mock('@services/section.service', () => ({
    getTerms: vi.fn().mockResolvedValue({ data: [] }),
    getFacultyOptions: vi.fn().mockResolvedValue({ data: [] }),
    getSections: vi.fn().mockResolvedValue({ data: [] }),
    getSectionById: vi.fn().mockResolvedValue({ data: null })
}));

describe('isChunkLoadError helper', () => {
    it('identifies dynamic import and chunk errors correctly', () => {
        expect(isChunkLoadError(new Error('Failed to fetch dynamically imported module: /src/pages/test.tsx'))).toBe(true);
        expect(isChunkLoadError(new Error('error loading dynamically imported module'))).toBe(true);
        expect(isChunkLoadError(new Error('Importing a module script failed'))).toBe(true);
        expect(isChunkLoadError({ name: 'ChunkLoadError', message: 'Loading chunk 5 failed' })).toBe(true);
    });

    it('rejects standard runtime errors as chunk errors', () => {
        expect(isChunkLoadError(new TypeError("Cannot read properties of undefined (reading '0')"))).toBe(false);
        expect(isChunkLoadError(new ReferenceError('foo is not defined'))).toBe(false);
        expect(isChunkLoadError(new Error('Network request failed'))).toBe(false);
        expect(isChunkLoadError(null)).toBe(false);
    });
});

describe('FacultyLoadModule', () => {
    it('renders FacultyLoadManagement without crashing', async () => {
        const FacultyLoadManagement = (await import('@pages/dean/faculty-load')).default;
        const { container } = render(
            <BrowserRouter>
                <FacultyLoadManagement />
            </BrowserRouter>
        );
        expect(container).toBeDefined();
    }, 15000);

    it('renders FacultyLoadWizardModal gracefully even with assigned_sections response', async () => {
        const FacultyLoadWizardModal = (await import('@pages/dean/faculty-load/FacultyLoadWizardModal')).default;
        const { container } = render(
            <BrowserRouter>
                <FacultyLoadWizardModal
                    facultyId="fac-1"
                    open={true}
                    onClose={vi.fn()}
                    onSuccess={vi.fn()}
                />
            </BrowserRouter>
        );
        expect(container).toBeDefined();
    });
});
