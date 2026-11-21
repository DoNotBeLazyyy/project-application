import SubjectGradeList from '@pages/student/subject/SubjectGradeList';
import { render, screen } from '@testing-library/react';
import { SubjectGradeItem } from '@type/student-portal.type';
import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

type MockRow = Record<string, unknown>;

interface MockColumn {
    cellRenderer?: (params: { data: MockRow }) => ReactNode;
    colId?: string;
    field?: string;
    headerName?: string;
    valueFormatter?: (params: { value: unknown; data: MockRow }) => ReactNode;
}

interface MockTableProps {
    leadingColumnDefs: MockColumn[];
    rowData: MockRow[];
}

vi.mock('@components/table/CommonTable', () => ({
    default: ({ leadingColumnDefs, rowData }: MockTableProps) => (
        <div data-testid="mock-table">
            {rowData.map((row, rowIndex) => (
                <div
                    data-testid={`row-${rowIndex}`}
                    key={rowIndex}
                >
                    {leadingColumnDefs.map((col) => {
                        const value = (col.field
                            ? row[col.field]
                            : undefined) as ReactNode;
                        const formatted = col.valueFormatter
                            ? col.valueFormatter({ value, data: row })
                            : value;
                        const rendered = col.cellRenderer
                            ? col.cellRenderer({ data: row })
                            : null;
                        return (
                            <div key={col.headerName || col.field || col.colId}>
                                <span>{col.headerName}:</span>
                                <div>{rendered || formatted}</div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    )
}));

describe('SubjectGradeList', () => {
    it('displays Released badge, breakdown button, and numeric grades when grades are released', () => {
        const releasedGrades: SubjectGradeItem[] = [
            {
                grading_period_id: 'gp-1',
                grading_period_name: 'Midterm',
                sequence: 1,
                raw_grade: 88,
                final_grade: 90,
                transmuted_grade: 1.5,
                special_grade: null,
                status: 'Released',
                is_visible: true,
                evaluation_completed: true
            }
        ];

        render(
            <BrowserRouter>
                <SubjectGradeList
                    enrollmentId="enrollment-1"
                    grades={releasedGrades}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('Midterm'))
            .toBeInTheDocument();
        expect(screen.getByText('Released'))
            .toBeInTheDocument();
        expect(screen.getByText('View breakdown'))
            .toBeInTheDocument();
        expect(screen.getByText('88'))
            .toBeInTheDocument();
        expect(screen.getByText('90'))
            .toBeInTheDocument();
        expect(screen.getByText('1.50'))
            .toBeInTheDocument();
    });

    it('displays Evaluation Required badge, Evaluate button, and Locked grades when registrar approved but evaluation is pending', () => {
        const evaluationPendingGrades: SubjectGradeItem[] = [
            {
                grading_period_id: 'gp-2',
                grading_period_name: 'Finals',
                sequence: 2,
                raw_grade: null,
                final_grade: null,
                transmuted_grade: null,
                special_grade: null,
                status: 'Approved',
                is_visible: true,
                evaluation_completed: false
            }
        ];

        render(
            <BrowserRouter>
                <SubjectGradeList
                    enrollmentId="enrollment-1"
                    grades={evaluationPendingGrades}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('Finals'))
            .toBeInTheDocument();
        expect(screen.getByText('Evaluation Required'))
            .toBeInTheDocument();
        expect(screen.getByText('Evaluate to view'))
            .toBeInTheDocument();
        const lockedBadges = screen.getAllByText('Locked');
        expect(lockedBadges.length)
            .toBe(3); // Raw, Final, Transmuted
    });

    it('displays Pending Registrar Release and dashes when grades are not yet approved or released', () => {
        const pendingGrades: SubjectGradeItem[] = [
            {
                grading_period_id: 'gp-3',
                grading_period_name: 'Prelims',
                sequence: 1,
                raw_grade: null,
                final_grade: null,
                transmuted_grade: null,
                special_grade: null,
                status: 'Submitted',
                is_visible: false,
                evaluation_completed: false
            }
        ];

        render(
            <BrowserRouter>
                <SubjectGradeList
                    enrollmentId="enrollment-1"
                    grades={pendingGrades}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('Prelims'))
            .toBeInTheDocument();
        expect(screen.getByText('Pending Registrar Release'))
            .toBeInTheDocument();
        const dashes = screen.getAllByText('—');
        expect(dashes.length)
            .toBe(3); // Raw, Final, Transmuted
    });

    it('keeps an Approved grade locked until the Registrar releases it, even after the evaluation', () => {
        const approvedGrades: SubjectGradeItem[] = [
            {
                grading_period_id: 'gp-4',
                grading_period_name: 'Midterm',
                sequence: 2,
                raw_grade: 88,
                final_grade: 88,
                transmuted_grade: 1.75,
                special_grade: null,
                status: 'Approved',
                is_visible: true,
                evaluation_completed: true
            }
        ];

        render(
            <BrowserRouter>
                <SubjectGradeList
                    enrollmentId="enrollment-1"
                    grades={approvedGrades}
                />
            </BrowserRouter>
        );

        expect(screen.getByText('Pending Registrar Release'))
            .toBeInTheDocument();
        expect(screen.queryByText('1.75'))
            .not.toBeInTheDocument();
        expect(screen.queryByText('Evaluate to view'))
            .not.toBeInTheDocument();
    });

    it('shows the special grade instead of 0 for Raw and Final', () => {
        const specialGrades: SubjectGradeItem[] = [
            {
                grading_period_id: 'gp-5',
                grading_period_name: 'Finals',
                sequence: 3,
                raw_grade: 0,
                final_grade: 0,
                transmuted_grade: null,
                special_grade: 'INC',
                status: 'Released',
                is_visible: true,
                evaluation_completed: true
            }
        ];

        render(
            <BrowserRouter>
                <SubjectGradeList
                    enrollmentId="enrollment-1"
                    grades={specialGrades}
                />
            </BrowserRouter>
        );

        expect(screen.getAllByText('INC').length)
            .toBe(3); // Raw, Final, Transmuted
    });
});