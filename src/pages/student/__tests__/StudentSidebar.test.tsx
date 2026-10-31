import StudentLayout from '@pages/student/StudentLayout';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@services/profile.service', () => ({
    getMyProfile: vi.fn()
        .mockResolvedValue({
            data: {
                first_name: 'Student',
                last_name: 'Test',
                profile_completed: true,
                student: { id: 'test-student-id' }
            }
        })
}));

vi.mock('@stores/app.store', () => ({
    useAppStore: vi.fn((selector) =>
        selector({
            activeRole: 'student',
            availableRoles: [{ code: 'student', label: 'Student' }],
            userProfile: {
                first_name: 'Student',
                last_name: 'Test',
                profile_completed: true
            }
        }))
}));

vi.mock('@components/modal/StudentProfilePromptModal', () => ({
    default: () => null
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async() => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

describe('StudentLayout Navigation & Sidebar', () => {
    it('separates Curriculum Audit and Grade Report as separate options in the sidebar', async() => {
        await act(async() => {
            render(
                <MemoryRouter initialEntries={['/student']}>
                    <StudentLayout />
                </MemoryRouter>
            );
        });

        const curriculumAuditItem = screen.getByText('Curriculum Audit');
        const gradeReportItem = screen.getByText('Grade Report');

        expect(curriculumAuditItem)
            .toBeInTheDocument();
        expect(gradeReportItem)
            .toBeInTheDocument();

        fireEvent.click(curriculumAuditItem);
        expect(mockNavigate)
            .toHaveBeenCalledWith('/student/curriculum');

        fireEvent.click(gradeReportItem);
        expect(mockNavigate)
            .toHaveBeenCalledWith('/student/grade-report');
    });
});