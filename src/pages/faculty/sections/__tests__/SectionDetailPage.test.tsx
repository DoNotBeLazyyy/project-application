import * as facultyService from '@services/faculty.service';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

import SectionDetailPage from '../SectionDetailPage';

vi.mock('@services/faculty.service', () => ({
    getSectionDetail: vi.fn(),
    listAssessments: vi.fn(),
    listAttendanceSessions: vi.fn(),
    listGradingPeriodsBySection: vi.fn(),
    getSectionSpecialGradeOverrides: vi.fn()
}));

vi.mock('@pages/shared/content/SectionContentPanel', () => ({
    default: ({ sectionId }: { sectionId: string }) => (
        <div data-testid="faculty-content-panel">Content for {sectionId}</div>
    )
}));

vi.mock('@pages/faculty/sections/AssessmentsTab', () => ({
    default: () => <div data-testid="faculty-assessments-tab">Assessments Tab</div>
}));

vi.mock('@pages/faculty/sections/grading/GradingTab', () => ({
    default: () => <div data-testid="faculty-grading-tab">Grading Tab</div>
}));

vi.mock('@pages/faculty/sections/attendance/AttendanceTab', () => ({
    default: () => <div data-testid="faculty-attendance-tab">Attendance Tab</div>
}));

vi.mock('@pages/faculty/sections/StudentsTab', () => ({
    default: () => <div data-testid="faculty-students-tab">Students Tab</div>
}));

vi.mock('@pages/shared/discussion/SectionDiscussionPanel', () => ({
    default: ({ sectionId }: { sectionId: string }) => (
        <div data-testid="faculty-discussion-panel">Discussions for {sectionId}</div>
    )
}));

vi.mock('@pages/shared/announcement/SectionAnnouncementPanel', () => ({
    default: ({ sectionId }: { sectionId: string }) => (
        <div data-testid="faculty-announcement-panel">Announcements for {sectionId}</div>
    )
}));

describe('SectionDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(facultyService.getSectionDetail)
            .mockResolvedValue({
                data: {
                    id: 'sec-101',
                    section_code: 'BSCS 2-A',
                    course_code: 'CS201',
                    course_title: 'Data Structures and Algorithms',
                    term_label: '1st Trimester - AY 2026-2027',
                    term_id: 'term-1',
                    status: 'Open',
                    max_slots: 40,
                    room: 'Lab 3'
                },
                error: null
            });
    });

    it('renders the header with back button, section badge, title, and metadata pills', async() => {
        render(
            <MemoryRouter initialEntries={['/faculty/sections/sec-101']}>
                <Routes>
                    <Route
                        element={<SectionDetailPage />}
                        path="/faculty/sections/:sectionId"
                    />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('BSCS 2-A'))
                .toBeInTheDocument();
        });

        expect(screen.getByText(/CS201 — Data Structures and Algorithms/i))
            .toBeInTheDocument();
        expect(screen.getByText('1st Trimester - AY 2026-2027'))
            .toBeInTheDocument();
        expect(screen.getByText('Lab 3'))
            .toBeInTheDocument();
        expect(screen.getByRole('button', { name: /back to my sections/i }))
            .toBeInTheDocument();
    });

    it('renders horizontal scrollable tabs and defaults to Lessons & Syllabus', async() => {
        render(
            <MemoryRouter initialEntries={['/faculty/sections/sec-101']}>
                <Routes>
                    <Route
                        element={<SectionDetailPage />}
                        path="/faculty/sections/:sectionId"
                    />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Lessons & Syllabus'))
                .toBeInTheDocument();
        });

        expect(screen.getByText('Assessments'))
            .toBeInTheDocument();
        expect(screen.getByText('Gradebook'))
            .toBeInTheDocument();
        expect(screen.getByText('Attendance'))
            .toBeInTheDocument();
        expect(screen.getByText('Class Roster'))
            .toBeInTheDocument();
        expect(screen.getByText('Discussions'))
            .toBeInTheDocument();
        expect(screen.getByText('Announcements'))
            .toBeInTheDocument();

        expect(screen.getByTestId('faculty-content-panel'))
            .toBeInTheDocument();
    });
});