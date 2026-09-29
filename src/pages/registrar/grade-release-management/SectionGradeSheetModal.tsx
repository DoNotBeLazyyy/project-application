import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import PageLoadingFallback from '@components/loading/PageLoadingFallback';
import CommonActionModal from '@components/modal/CommonActionModal';
import ConfirmPromptModal from '@components/modal/ConfirmPromptModal';
import {
    CheckCircleIcon,
    ClockIcon,
    MagnifyingGlassIcon,
    SealCheckIcon,
    UserIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { approveAndReleaseSection, getSectionGradeSheet } from '@services/grade-release.service';
import { SectionGradeSheetStudent, SectionGradeSubmissionRow } from '@type/grade-release.type';
import { useCallback, useEffect, useMemo, useState } from 'react';

interface SectionGradeSheetModalProps {
    gradingPeriodId: string;
    gradingPeriodName: string;
    open: boolean;
    section: SectionGradeSubmissionRow | null;
    onClose: () => void;
    onReleased?: () => void;
}

function resolveGradeStatusVariant(status: string): 'default' | 'success' | 'warning' | 'info' | 'error' {
    switch (status) {
        case 'Released':
            return 'success';
        case 'Approved':
            return 'info';
        case 'Submitted':
            return 'warning';
        case 'Draft':
            return 'default';
        default:
            return 'default';
    }
}

export default function SectionGradeSheetModal({
    gradingPeriodId,
    gradingPeriodName,
    open,
    section,
    onClose,
    onReleased
}: SectionGradeSheetModalProps) {
    const [students, setStudents] = useState<SectionGradeSheetStudent[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [isReleasing, setIsReleasing] = useState(false);
    const [showConfirmRelease, setShowConfirmRelease] = useState(false);

    const loadGradeSheet = useCallback(async function() {
        if (!section || !gradingPeriodId) {
            return;
        }

        setIsLoading(true);
        try {
            const result = await getSectionGradeSheet(section.section_id, gradingPeriodId);
            if (result.data) {
                setStudents(result.data);
            }
        } finally {
            setIsLoading(false);
        }
    }, [section, gradingPeriodId]);

    useEffect(function() {
        if (open && section) {
            setSearch('');
            loadGradeSheet();
        } else {
            setStudents([]);
        }
    }, [open, section, loadGradeSheet]);

    const filteredStudents = useMemo(function() {
        const query = search.trim().toLowerCase();
        if (!query) {
            return students;
        }

        return students.filter(function(st) {
            return (
                st.student_number.toLowerCase().includes(query) ||
                st.full_name.toLowerCase().includes(query) ||
                (st.special_grade && st.special_grade.toLowerCase().includes(query))
            );
        });
    }, [students, search]);

    const stats = useMemo(function() {
        const total = students.length;
        const withGrades = students.filter((s) => s.final_grade !== null);
        const avg = withGrades.length > 0
            ? (withGrades.reduce((sum, s) => sum + (s.final_grade ?? 0), 0) / withGrades.length).toFixed(1)
            : '—';
        const passing = withGrades.filter((s) => (s.final_grade ?? 0) >= 75).length;
        const specials = students.filter((s) => !!s.special_grade).length;
        const evalCompleted = students.filter((s) => s.is_evaluation_completed).length;
        const evalBlocked = total - evalCompleted;

        return { avg, evalBlocked, evalCompleted, passing, specials, total };
    }, [students]);

    async function handleConfirmApproveAndRelease() {
        if (!section || !gradingPeriodId) {
            return;
        }

        setIsReleasing(true);
        try {
            const result = await approveAndReleaseSection(section.section_id, gradingPeriodId);
            if (result.data?.success) {
                setShowConfirmRelease(false);
                await loadGradeSheet();
                onReleased?.();
            }
        } finally {
            setIsReleasing(false);
        }
    }

    const canReleaseSection = Boolean(
        section &&
        section.submission_status !== 'Released' &&
        section.submission_status !== 'No Enrollees' &&
        section.graded_count > 0
    );

    if (!section) {
        return null;
    }

    return (
        <>
            <CommonActionModal
                cardProps={{
                    cardHeaderProps: {
                        subheader: `${section.course_title} · Section ${section.section_code} · ${gradingPeriodName}`,
                        title: `${section.course_code} - Grade Sheet`
                    }
                }}
                containerClassName="max-w-full w-[68rem]"
                formButtonsProps={{
                    cancelProps: {
                        children: 'Close',
                        onClick: onClose
                    },
                    confirmProps: {
                        children: (
                            <div className="flex gap-1.5 items-center">
                                <SealCheckIcon size={16} weight="bold" />
                                <span>{section.submission_status === 'Approved' ? 'Release to Students' : 'Approve & Release'}</span>
                            </div>
                        ),
                        disabled: !canReleaseSection || isReleasing,
                        onClick: () => setShowConfirmRelease(true)
                    }
                }}
                open={open}
                onClose={onClose}
            >
                <div className="flex flex-col gap-4">
                    {/* Faculty & Meta Bar */}
                    <div className="bg-(--mui-palette-action-hover)/30 border border-(--mui-palette-divider) flex flex-wrap gap-4 items-center justify-between p-3 rounded-lg text-sm">
                        <div className="flex gap-2 items-center text-(--mui-palette-text-primary)">
                            <UserIcon className="text-(--mui-palette-primary-main)" size={18} weight="bold" />
                            <span className="font-semibold">Instructor:</span>
                            <span>{section.faculty_name}</span>
                            {section.faculty_email && (
                                <span className="text-(--mui-palette-text-secondary) text-xs">({section.faculty_email})</span>
                            )}
                        </div>
                        <div className="flex gap-4 items-center text-xs">
                            {section.room && (
                                <span className="text-(--mui-palette-text-secondary)">
                                    Room: <span className="font-medium text-(--mui-palette-text-primary)">{section.room}</span>
                                </span>
                            )}
                            <span className="text-(--mui-palette-text-secondary)">
                                Status: <CommonBadgeStatus label={section.submission_status} variant={resolveGradeStatusVariant(section.submission_status)} />
                            </span>
                        </div>
                    </div>

                    {/* Stats Tiles */}
                    <div className="gap-3 grid grid-cols-2 sm:grid-cols-5">
                        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col p-2.5 rounded-lg text-center">
                            <span className="font-bold text-(--mui-palette-text-primary) text-lg">{stats.total}</span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">Enrolled</span>
                        </div>
                        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col p-2.5 rounded-lg text-center">
                            <span className="font-bold text-(--mui-palette-primary-main) text-lg">{stats.avg}</span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">Class Average</span>
                        </div>
                        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col p-2.5 rounded-lg text-center">
                            <span className="font-bold text-(--mui-palette-success-main) text-lg">{stats.passing}</span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">Passing (≥ 75%)</span>
                        </div>
                        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col p-2.5 rounded-lg text-center">
                            <span className="font-bold text-(--mui-palette-info-main) text-lg">{stats.evalCompleted}/{stats.total}</span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">Evaluations Done</span>
                        </div>
                        <div className="bg-(--mui-palette-background-paper) border border-(--mui-palette-divider) flex flex-col p-2.5 rounded-lg text-center">
                            <span className="font-bold text-(--mui-palette-warning-main) text-lg">{stats.specials}</span>
                            <span className="text-(--mui-palette-text-secondary) text-xs">Special Grades</span>
                        </div>
                    </div>

                    {/* Evaluation Blocking Callout if any */}
                    {stats.evalBlocked > 0 && section.submission_status !== 'Released' && (
                        <div className="bg-(--mui-palette-warning-50)/40 border border-(--mui-palette-warning-main)/30 flex gap-2.5 items-start p-3 rounded-lg text-(--mui-palette-warning-dark) text-xs">
                            <WarningCircleIcon className="shrink-0 text-(--mui-palette-warning-main)" size={18} weight="fill" />
                            <div>
                                <span className="font-semibold">{stats.evalBlocked} student(s) have not submitted their faculty evaluation.</span>
                                <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                                    When released, grades will immediately become visible to the {stats.evalCompleted} compliant students. Non-compliant students will have their grades unblocked automatically as soon as they complete their evaluation.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Search Field */}
                    <div className="flex items-center justify-between">
                        <div className="w-full sm:w-72">
                            <CommonInput
                                fullWidth
                                placeholder="Search student name or number..."
                                size="small"
                                startIcon={<MagnifyingGlassIcon size={16} />}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <span className="text-(--mui-palette-text-secondary) text-xs">
                            Showing {filteredStudents.length} of {students.length} students
                        </span>
                    </div>

                    {/* Students Table */}
                    <div className="border border-(--mui-palette-divider) max-h-96 overflow-x-auto overflow-y-auto rounded-lg">
                        {isLoading ? (
                            <div className="py-12">
                                <PageLoadingFallback />
                            </div>
                        ) : filteredStudents.length === 0 ? (
                            <div className="p-8 text-center text-(--mui-palette-text-secondary) text-sm">
                                {students.length === 0 ? 'No students enrolled or no grades generated yet.' : 'No matching students found.'}
                            </div>
                        ) : (
                            <table className="border-collapse text-left text-sm w-full">
                                <thead className="bg-(--mui-palette-action-hover)/50 border-b border-(--mui-palette-divider) sticky text-(--mui-palette-text-secondary) text-xs top-0 uppercase">
                                    <tr>
                                        <th className="font-semibold p-3">Student No.</th>
                                        <th className="font-semibold p-3">Student Name</th>
                                        <th className="font-semibold p-3 text-right">Raw Grade</th>
                                        <th className="font-semibold p-3 text-right">Final Grade</th>
                                        <th className="font-semibold p-3 text-right">Transmuted</th>
                                        <th className="font-semibold p-3 text-center">Special</th>
                                        <th className="font-semibold p-3 text-center">Status</th>
                                        <th className="font-semibold p-3 text-center">Evaluation</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-(--mui-palette-divider)">
                                    {filteredStudents.map(function(st) {
                                        return (
                                            <tr className="hover:bg-(--mui-palette-action-hover)/30 transition-colors" key={st.enrollment_id}>
                                                <td className="font-mono p-3 text-(--mui-palette-text-secondary) text-xs whitespace-nowrap">
                                                    {st.student_number}
                                                </td>
                                                <td className="font-medium p-3 text-(--mui-palette-text-primary) whitespace-nowrap">
                                                    {st.full_name}
                                                </td>
                                                <td className="p-3 text-(--mui-palette-text-secondary) text-right">
                                                    {st.raw_grade !== null ? Number(st.raw_grade).toFixed(2) : '—'}
                                                </td>
                                                <td className="font-semibold p-3 text-(--mui-palette-text-primary) text-right">
                                                    {st.final_grade !== null ? (
                                                        <span className={Number(st.final_grade) < 75 ? 'text-(--mui-palette-error-main)' : ''}>
                                                            {Number(st.final_grade).toFixed(2)}
                                                        </span>
                                                    ) : '—'}
                                                </td>
                                                <td className="font-mono p-3 text-(--mui-palette-primary-main) text-right">
                                                    {st.transmuted_grade !== null ? Number(st.transmuted_grade).toFixed(2) : '—'}
                                                </td>
                                                <td className="p-3 text-center">
                                                    {st.special_grade ? (
                                                        <span className="bg-(--mui-palette-warning-50) font-semibold px-2 py-0.5 rounded text-(--mui-palette-warning-dark) text-xs">
                                                            {st.special_grade}
                                                        </span>
                                                    ) : (
                                                        <span className="text-(--mui-palette-text-disabled)">—</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-center">
                                                    <CommonBadgeStatus label={st.status} variant={resolveGradeStatusVariant(st.status)} />
                                                </td>
                                                <td className="p-3 text-center">
                                                    {st.is_evaluation_completed ? (
                                                        <span className="flex gap-1 inline-flex items-center text-(--mui-palette-success-main) text-xs">
                                                            <CheckCircleIcon size={14} weight="fill" />
                                                            <span>Completed</span>
                                                        </span>
                                                    ) : (
                                                        <span className="flex gap-1 inline-flex items-center text-(--mui-palette-warning-main) text-xs">
                                                            <ClockIcon size={14} weight="bold" />
                                                            <span>Pending</span>
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </CommonActionModal>

            <ConfirmPromptModal
                formButtonsProps={{
                    cancelProps: {
                        children: 'Cancel',
                        onClick: () => setShowConfirmRelease(false)
                    },
                    confirmProps: {
                        children: isReleasing ? 'Releasing...' : 'Confirm Release',
                        disabled: isReleasing,
                        onClick: handleConfirmApproveAndRelease
                    }
                }}
                mainContent={{
                    title: `Release ${section.course_code} (${section.section_code}) grades?`
                }}
                open={showConfirmRelease}
                subContent={{
                    title: stats.evalBlocked > 0
                        ? `${stats.evalCompleted} of ${stats.total} student(s) will see their grades immediately. ${stats.evalBlocked} student(s) have pending faculty evaluations and will be unblocked as soon as they submit them.`
                        : `All ${stats.total} student(s) have completed faculty evaluations and will see their official grades immediately.`
                }}
                onClose={() => setShowConfirmRelease(false)}
            />
        </>
    );
}
