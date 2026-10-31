import { render, screen } from '@testing-library/react';
import { SubjectGradeItem } from '@type/student-portal.type';
import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import SubjectGradeList from '../SubjectGradeList';

vi.mock('@components/table/CommonTable', () => ({
    default: ({ leadingColumnDefs, rowData }: any) => (
        <div data-testid="mock-table">
            {rowData.map((row: any, rowIndex: number) => (
                <div
                    data-testid={`row-${rowIndex}`}
                    key={rowIndex}
                >
                    {leadingColumnDefs.map((col: any) => {
                        const value = col.field
                            ? row[col.field]
                            : undefined;
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
        expect(screen.getByText('1.5'))
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
});