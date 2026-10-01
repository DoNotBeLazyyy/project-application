import CommonBentoCard from '@components/card/CommonBentoCard';
import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { SortColumn } from '@components/modal/sort-modal/SortColumnItem';
import CommonTableCard from '@components/table-card/CommonTableCard';
import { SEARCH_HINTS } from '@constants/search-hint.constant';
import StudentEvaluationModal from '@pages/faculty/sections/StudentEvaluationModal';
import { listSectionStudents } from '@services/faculty.service';
import { SectionStudent } from '@type/faculty.type';
import { SortStringDto } from '@type/http.type';
import { MobileCardColDef } from '@type/table.type';
import { useMemo, useState } from 'react';

const SORT_COLUMNS: SortColumn[] = [
    { field: 'student_number', label: 'Student No.' },
    { field: 'full_name', label: 'Full Name' },
    { field: 'email', label: 'Email' },
    { field: 'year_level', label: 'Year Level' },
    { field: 'enrolled_at', label: 'Enrolled At' }
];

interface StudentsTabProps {
    sectionId: string;
}

export default function StudentsTab({ sectionId }: StudentsTabProps) {
    const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);

    const columnDefs = useMemo<MobileCardColDef[]>(function() {
        return [
            {
                field: 'student_number',
                flex: 1,
                headerName: 'Student No.',
                mobileCard: 'subtitle',
                sortable: true
            },
            {
                field: 'full_name',
                flex: 2,
                headerName: 'Full Name',
                mobileCard: 'title',
                sortable: true
            },
            {
                field: 'email',
                flex: 3,
                headerName: 'Email',
                mobileCard: 'hidden',
                sortable: true
            },
            {
                field: 'year_level',
                flex: 1,
                headerName: 'Year Level',
                sortable: true
            },
            {
                cellRenderer: (params: { data: SectionStudent }) => {
                    const student = params.data as any;
                    if (student.has_pending_verification) {
                        return (
                            <CommonBadgeStatus
                                label="Pending Verification"
                                variant="warning"
                            />
                        );
                    }
                    if (student.risk_level === 'High' || student.risk_level === 'Moderate') {
                        return (
                            <CommonBadgeStatus
                                label={`At Risk (${student.risk_level})`}
                                variant={student.risk_level === 'High' ? 'error' : 'warning'}
                            />
                        );
                    }
                    if (student.gwa !== null && student.gwa !== undefined && student.gwa <= 1.75) {
                        return (
                            <CommonBadgeStatus
                                label="Dean's List Candidate"
                                variant="success"
                            />
                        );
                    }
                    return (
                        <CommonBadgeStatus
                            label={student.status ?? 'Enrolled'}
                            variant="info"
                        />
                    );
                },
                field: 'status',
                flex: 1.5,
                headerName: 'Academic Status',
                sortable: false
            },
            {
                field: 'enrolled_at',
                flex: 2,
                headerName: 'Enrolled At',
                sortable: true,
                valueFormatter: (params) => params.value
                    ? new Date(params.value)
                        .toLocaleDateString()
                    : '—'
            }
        ];
    }, []);

    async function fetchStudents(
        page: number,
        size: number,
        search: string,
        sort: SortStringDto[]
    ) {
        return listSectionStudents(sectionId, page, size, search, sort);
    }

    return (
        <>
            <CommonTableCard<SectionStudent>
                cardHeaderProps={{
                    subheader: 'Select a student to view their attendance, assessments, and grades.',
                    title: 'Roster'
                }}
                controls={{
                    tableInputProps: {
                        searchHints: SEARCH_HINTS.sectionStudents
                    }
                }}
                sortColumns={SORT_COLUMNS}
                tableProps={{
                    leadingColumnDefs: columnDefs
                }}
                uniqueIdKey="enrollment_id"
                onFetch={fetchStudents}
                onRowClick={setSelectedEnrollmentId}
                renderGridCard={(student, isSelected, onToggleSelect) => {
                    const isDeansList = student.gwa !== null && student.gwa !== undefined && student.gwa <= 1.75;
                    const isAtRisk = student.risk_level === 'High' || student.risk_level === 'Moderate';

                    const statusLabel = isAtRisk
                        ? `At Risk (${student.risk_level})`
                        : isDeansList
                        ? "Dean's List Candidate"
                        : student.status ?? 'Enrolled';

                    const enrolledDate = student.enrolled_at
                        ? new Date(student.enrolled_at).toLocaleDateString()
                        : '—';

                    return (
                        <CommonBentoCard
                            code={student.student_number}
                            hasCheckbox={false}
                            isSelected={isSelected}
                            onClick={() => setSelectedEnrollmentId(student.enrollment_id)}
                            onToggleSelect={onToggleSelect}
                            status={statusLabel}
                            subtitle={student.email}
                            title={student.full_name}
                            facts={[
                                { label: 'Year Level', value: `Year ${student.year_level}` },
                                { label: 'Enrolled', value: enrolledDate }
                            ]}
                            metrics={[
                                { label: 'Current GWA', value: student.gwa != null ? String(student.gwa) : 'N/A' },
                                {
                                    label: 'Academic Standing',
                                    value: isAtRisk
                                        ? `At Risk (${student.risk_level})`
                                        : isDeansList
                                        ? 'Dean’s List Standing'
                                        : 'Good Standing'
                                }
                            ]}
                            primaryAction={{
                                label: 'View Evaluation',
                                onClick: () => setSelectedEnrollmentId(student.enrollment_id)
                            }}
                        />
                    );
                }}
            />
            <StudentEvaluationModal
                enrollmentId={selectedEnrollmentId}
                open={Boolean(selectedEnrollmentId)}
                onClose={function() {
                    setSelectedEnrollmentId(null);
                }}
            />
        </>
    );
}