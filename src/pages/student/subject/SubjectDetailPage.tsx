import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import CommonTabMenu from '@components/tab-menu/CommonTabMenu';
import SubjectAssessmentList from '@pages/student/subject/SubjectAssessmentList';
import SubjectGradeList from '@pages/student/subject/SubjectGradeList';
import { ArrowLeftIcon, ClipboardTextIcon, GraduationCapIcon } from '@phosphor-icons/react';
import { getSubjectAssessments, getSubjectDetail, getSubjectGrades } from '@services/student-portal.service';
import { SubjectAssessmentItem, SubjectDetail, SubjectGradeItem } from '@type/student-portal.type';
import { SyntheticEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

type SubjectTab = 'assessments' | 'grades';

export default function SubjectDetailPage() {
    const { enrollmentId = '' } = useParams<{ enrollmentId: string }>();
    const navigate = useNavigate();
    const [subject, setSubject] = useState<SubjectDetail | null>(null);
    const [activeTab, setActiveTab] = useState<SubjectTab>('assessments');
    const [assessments, setAssessments] = useState<SubjectAssessmentItem[] | null>(null);
    const [grades, setGrades] = useState<SubjectGradeItem[] | null>(null);

    useEffect(function() {
        if (!enrollmentId) return;

        async function fetchSubject() {
            const result = await getSubjectDetail(enrollmentId);
            if (result.data) setSubject(result.data);
        }

        fetchSubject();
    }, [enrollmentId]);

    useEffect(function() {
        if (!enrollmentId) return;

        async function fetchAssessments() {
            const result = await getSubjectAssessments(enrollmentId);
            if (result.data) setAssessments(result.data);
        }

        async function fetchGrades() {
            const result = await getSubjectGrades(enrollmentId);
            if (result.data) setGrades(result.data);
        }

        if (activeTab === 'assessments' && assessments === null) fetchAssessments();
        if (activeTab === 'grades' && grades === null) fetchGrades();
    }, [activeTab, assessments, enrollmentId, grades]);

    function handleTabChange(_: SyntheticEvent, value: string) {
        setActiveTab(value as SubjectTab);
    }

    return (
        <CommonCard className="flex flex-col gap-4 h-full p-4 w-full">
            <div className="flex gap-3 items-center">
                <CommonButton
                    color="inherit"
                    size="small"
                    startIcon={<ArrowLeftIcon size={16} weight="bold" />}
                    variant="outlined"
                    onClick={function() {
                        navigate('/student/subjects');
                    }}
                >
                    Back
                </CommonButton>
                <div className="flex flex-col">
                    <div className="flex gap-2 items-center">
                        <h1 className="font-semibold text-(--mui-palette-text-primary) text-xl">
                            {subject?.course_code ?? '—'}
                        </h1>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            /
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {subject?.course_title}
                        </span>
                    </div>
                    <div className="flex gap-3 items-center">
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {subject?.section_code}
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            ·
                        </span>
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {subject?.term_label}
                        </span>
                        {subject?.faculty_name && (
                            <>
                                <span className="text-(--mui-palette-text-secondary) text-sm">
                                    ·
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-sm">
                                    {subject.faculty_name}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
            <CommonTabMenu
                menuStyle="outline"
                tabs={[
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
                {activeTab === 'assessments' && (
                    <SubjectAssessmentList
                        assessments={assessments ?? []}
                        enrollmentId={enrollmentId}
                    />
                )}
                {activeTab === 'grades' && (
                    <SubjectGradeList grades={grades ?? []} />
                )}
            </div>
        </CommonCard>
    );
}