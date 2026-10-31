import SubjectDetailPage from '@pages/student/subject/SubjectDetailPage';
import * as studentPortalService from '@services/student-portal.service';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import {
    beforeEach, describe, expect, it, vi
} from 'vitest';

vi.mock('@services/student-portal.service', () => ({
    getSubjectDetail: vi.fn(),
    getSubjectAssessments: vi.fn(),
    getSubjectAttendance: vi.fn(),
    getSubjectGrades: vi.fn()
}));

vi.mock('@pages/shared/content/SectionContentPanel', () => ({
    default: ({ sectionId }: { sectionId: string }) => (
        <div data-testid="section-content-panel">Content for {sectionId}</div>
    )
}));

vi.mock('@pages/shared/discussion/SectionDiscussionPanel', () => ({
    default: ({ sectionId }: { sectionId: string }) => (
        <div data-testid="section-discussion-panel">Discussions for {sectionId}</div>
    )
}));

vi.mock('@pages/shared/announcement/SectionAnnouncementPanel', () => ({
    default: ({ sectionId }: { sectionId: string }) => (
        <div data-testid="section-announcement-panel">Announcements for {sectionId}</div>
    )
}));

vi.mock('../SubjectAssessmentList', () => ({
    default: () => <div data-testid="subject-assessment-list">Assessments List</div>
}));

vi.mock('../SubjectAttendanceList', () => ({
    default: () => <div data-testid="subject-attendance-list">Attendance List</div>
}));

vi.mock('../SubjectGradeList', () => ({
    default: () => <div data-testid="subject-grade-list">Grades List</div>
}));

describe('SubjectDetailPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(studentPortalService.getSubjectDetail)
            .mockResolvedValue({
                data: {
                    enrollment_id: 'enr-123',
                    section_id: 'sec-456',
                    section_code: 'BSIT 1-A',
                    course_code: 'IT101',
                    course_title: 'Introduction to Computing',
                    term_label: '1st Trimester - AY 2026-2027',
                    faculty_name: 'Prof. Alan Turing',
                    enrollment_status: 'Enrolled'
                },
                error: null
            });
        vi.mocked(studentPortalService.getSubjectAssessments)
            .mockResolvedValue({
                data: [],
                error: null
            });
        vi.mocked(studentPortalService.getSubjectAttendance)
            .mockResolvedValue({
                data: [],
                error: null
            });
        vi.mocked(studentPortalService.getSubjectGrades)
            .mockResolvedValue({
                data: [],
                error: null
            });
    });

    it('renders the header matching faculty UI (section badge, course code, title, and metadata pills)', async() => {
        render(
            <MemoryRouter initialEntries={['/student/subjects/enr-123']}>
                <Routes>
                    <Route
                        element={<SubjectDetailPage />}
                        path="/student/subjects/:enrollmentId"
                    />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('BSIT 1-A'))
                .toBeInTheDocument();
        });

        expect(screen.getByText(/IT101 — Introduction to Computing/i))
            .toBeInTheDocument();
        expect(screen.getByText('1st Trimester - AY 2026-2027'))
            .toBeInTheDocument();
        expect(screen.getByText('Prof. Alan Turing'))
            .toBeInTheDocument();
        expect(screen.getByText('Enrolled'))
            .toBeInTheDocument();
    });

    it('renders identical mobile-friendly scrollable tabs as faculty', async() => {
        render(
            <MemoryRouter initialEntries={['/student/subjects/enr-123']}>
                <Routes>
                    <Route
                        element={<SubjectDetailPage />}
                        path="/student/subjects/:enrollmentId"
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
        expect(screen.getByText('Grades'))
            .toBeInTheDocument();
        expect(screen.getByText('Attendance'))
            .toBeInTheDocument();
        expect(screen.getByText('Discussions'))
            .toBeInTheDocument();
        expect(screen.getByText('Announcements'))
            .toBeInTheDocument();

        // Defaults to Lessons & Syllabus (content) like faculty
        expect(screen.getByTestId('section-content-panel'))
            .toBeInTheDocument();
    });

    it('activates the correct tab from searchParams (e.g. ?tab=assessments)', async() => {
        render(
            <MemoryRouter initialEntries={['/student/subjects/enr-123?tab=assessments']}>
                <Routes>
                    <Route
                        element={<SubjectDetailPage />}
                        path="/student/subjects/:enrollmentId"
                    />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('subject-assessment-list'))
                .toBeInTheDocument();
        });
    });

    it('supports tab=grading alias for grades tab', async() => {
        render(
            <MemoryRouter initialEntries={['/student/subjects/enr-123?tab=grading']}>
                <Routes>
                    <Route
                        element={<SubjectDetailPage />}
                        path="/student/subjects/:enrollmentId"
                    />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByTestId('subject-grade-list'))
                .toBeInTheDocument();
        });
    });
});