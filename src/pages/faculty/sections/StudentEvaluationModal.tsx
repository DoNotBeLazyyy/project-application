import CommonModal from '@components/modal/CommonModal';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import StudentAssessmentTab from '@pages/faculty/sections/student-detail/StudentAssessmentTab';
import StudentAttendanceTab from '@pages/faculty/sections/student-detail/StudentAttendanceTab';
import StudentGradeTab from '@pages/faculty/sections/student-detail/StudentGradeTab';
import { CalendarCheckIcon, ClipboardTextIcon, GraduationCapIcon, XIcon } from '@phosphor-icons/react';
import { getSectionStudentEvaluation } from '@services/faculty.service';
import { StudentEvaluation } from '@type/faculty.type';
import { IconButton } from '@mui/material';
import { SyntheticEvent, useEffect, useState } from 'react';

type EvaluationTab = 'attendance' | 'assessments' | 'grades';

interface StudentEvaluationModalProps {
    enrollmentId: string | null;
    open: boolean;
    onClose: () => void;
}

export default function StudentEvaluationModal({
    enrollmentId,
    open,
    onClose
}: StudentEvaluationModalProps) {
    const [data, setData] = useState<StudentEvaluation | null>(null);
    const [activeTab, setActiveTab] = useState<EvaluationTab>('attendance');

    async function fetchData(id: string) {
        const result = await getSectionStudentEvaluation(id);

        if (result.data) {
            setData(result.data);
        }
        else {
            onClose();
        }
    }

    useEffect(function() {
        if (!open || !enrollmentId) {
            return;
        }

        setData(null);
        setActiveTab('attendance');
        fetchData(enrollmentId);
    }, [open, enrollmentId]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as EvaluationTab);
    }

    function handleAttendanceChanged() {
        if (enrollmentId) {
            fetchData(enrollmentId);
        }
    }

    return (
        <CommonModal
            cardProps={{
                className: 'flex flex-col gap-4 h-[85vh] w-[min(94vw,860px)]'
            }}
            open={open}
            onClose={onClose}
        >
            <div className="flex items-start justify-between">
                <div className="flex flex-col gap-1">
                    <h2 className="font-semibold text-(--mui-palette-text-primary) text-lg">
                        {data?.profile.full_name ?? 'Loading student…'}
                    </h2>
                    {data && (
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-(--mui-palette-text-secondary) text-sm">
                            <span>{data.profile.student_number}</span>
                            <span>{data.profile.email}</span>
                            <span>Year {data.profile.year_level}</span>
                            {data.profile.program_name && (
                                <span>{data.profile.program_name}</span>
                            )}
                        </div>
                    )}
                </div>
                <IconButton size="small" onClick={onClose}>
                    <XIcon />
                </IconButton>
            </div>

            {!data
                ? (
                    <p className="flex-1 grid place-items-center text-(--mui-palette-text-secondary) text-sm">
                        Loading student evaluation…
                    </p>
                )
                : (
                    <>
                        <CommonTabMenu
                            menuStyle="outline"
                            tabs={[
                                {
                                    icon: <CalendarCheckIcon />,
                                    label: 'Attendance',
                                    value: 'attendance'
                                },
                                {
                                    icon: <ClipboardTextIcon />,
                                    label: 'Assessments',
                                    value: 'assessments'
                                },
                                {
                                    icon: <GraduationCapIcon />,
                                    label: 'Grades',
                                    value: 'grades'
                                }
                            ]}
                            value={activeTab}
                            onChange={handleTabChange}
                        />
                        <div className="flex flex-1 flex-col min-h-0">
                            {activeTab === 'attendance' && (
                                <StudentAttendanceTab
                                    enrollmentId={data.profile.enrollment_id}
                                    summary={data.attendance}
                                    onChanged={handleAttendanceChanged}
                                />
                            )}
                            {activeTab === 'assessments' && (
                                <StudentAssessmentTab assessments={data.assessments} />
                            )}
                            {activeTab === 'grades' && (
                                <StudentGradeTab
                                    enrollmentId={data.profile.enrollment_id}
                                    grades={data.grades}
                                />
                            )}
                        </div>
                    </>
                )
            }
        </CommonModal>
    );
}