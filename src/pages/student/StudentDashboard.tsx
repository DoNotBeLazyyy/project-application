import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonButton from '@components/button/CommonButton';
import CommonCard from '@components/card/CommonCard';
import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import InstitutionalIdentityCard from '@components/dashboard/InstitutionalIdentityCard';
import StudentInsightSummaryCard from '@components/dashboard/StudentInsightSummaryCard';
import StudentProfilePromptModal from '@components/modal/StudentProfilePromptModal';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import { BookOpenIcon, CalendarCheckIcon, ClockIcon, GraduationCapIcon, UserFocusIcon } from '@phosphor-icons/react';
import AssignProgramModal from '@pages/shared/records/AssignProgramModal';
import { getStudentInsight } from '@services/analytics.service';
import { getMyProfile } from '@services/profile.service';
import { getStudentDashboard } from '@services/student-portal.service';
import { StudentInsight } from '@type/analytics.type';
import { AssessmentType } from '@type/assessment.type';
import { MyProfile } from '@type/profile.type';
import { StudentDashboard as StudentDashboardData, UpcomingAssessment } from '@type/student-portal.type';
import { resolveStatValue } from '@utils/dashboard.util';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ASSESSMENT_TYPE_VARIANT: Record<AssessmentType, 'success' | 'error' | 'warning' | 'info'> = {
    Quiz: 'info',
    Exam: 'error',
    Activity: 'success',
    Assignment: 'warning',
    Project: 'info',
    'Lab Report': 'warning'
};

type StudentStatKey = 'enrolled' | 'upcoming' | 'released';

interface StudentStatCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: StudentStatKey;
    to: string;
}

const STAT_CARDS: StudentStatCard[] = [
    {
        icon: <BookOpenIcon size={24} />,
        iconBg: 'bg-(--mui-palette-primary-light)',
        iconColor: 'text-(--mui-palette-primary-main)',
        label: 'Enrolled Subjects',
        statKey: 'enrolled',
        to: '/student/subjects'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        iconBg: 'bg-(--mui-palette-warning-light)',
        iconColor: 'text-(--mui-palette-warning-main)',
        label: 'Upcoming Assessments',
        statKey: 'upcoming',
        to: '/student/subjects'
    },
    {
        icon: <GraduationCapIcon size={24} />,
        iconBg: 'bg-(--mui-palette-info-light)',
        iconColor: 'text-(--mui-palette-info-main)',
        label: 'Grades to View',
        statKey: 'released',
        to: '/student/grade'
    }
];

function resolveStudentStatValue(dashboard: StudentDashboardData | null, statKey: StudentStatKey): number | string {
    if (!dashboard) {
        return '—';
    }

    if (statKey === 'enrolled') {
        return resolveStatValue(dashboard.enrolled_count);
    }

    if (statKey === 'upcoming') {
        return resolveStatValue(dashboard.upcoming_count);
    }

    return resolveStatValue(dashboard.released_grades_count);
}

export default function StudentDashboard() {
    const navigate = useNavigate();
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
    const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
    const [insight, setInsight] = useState<StudentInsight | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    async function loadProfile() {
        const result = await getMyProfile();
        if (result.data) setProfile(result.data);
    }

    useEffect(function() {
        async function fetchDashboard() {
            const result = await getStudentDashboard();
            if (result.data) setDashboard(result.data);
        }

        async function fetchInsight() {
            const result = await getStudentInsight();
            if (result.data?.success) setInsight(result.data);
        }

        fetchDashboard();
        fetchInsight();
        loadProfile();
    }, []);

    function handleViewInsight() {
        navigate('/student/insight');
    }

    return (
        <div className="flex flex-col gap-4">
            <DashboardHeader
                subtitle="Your classes, assessments, and grades at a glance."
                title="Dashboard"
            />

            {!profile?.student && (
                <div className="border border-(--mui-palette-warning-main) bg-(--mui-palette-warning-light) p-4 rounded-lg flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <UserFocusIcon size={28} className="text-(--mui-palette-warning-main)" />
                        <div>
                            <p className="font-semibold text-(--mui-palette-text-primary) text-sm m-0">
                                Student Profile Missing
                            </p>
                            <p className="text-(--mui-palette-text-secondary) text-xs m-0">
                                You do not have an active student profile. Please fill in your student information to generate your student number and activate your account.
                            </p>
                        </div>
                    </div>
                    <CommonButton
                        size="small"
                        variant="contained"
                        onClick={function() {
                            setIsPromptModalOpen(true);
                        }}
                    >
                        Set Up Student Profile
                    </CommonButton>
                </div>
            )}

            {profile?.student && !profile.student.program_id && (
                <div className="border border-(--mui-palette-warning-main) bg-(--mui-palette-warning-light) p-4 rounded-lg flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <GraduationCapIcon size={28} className="text-(--mui-palette-warning-main)" />
                        <div>
                            <p className="font-semibold text-(--mui-palette-text-primary) text-sm m-0">
                                Academic Program Not Assigned
                            </p>
                            <p className="text-(--mui-palette-text-secondary) text-xs m-0">
                                You have not selected an academic program yet. Assign your program to generate your curriculum checklist and track your degree progress.
                            </p>
                        </div>
                    </div>
                    <CommonButton
                        size="small"
                        variant="contained"
                        onClick={function() {
                            setIsAssignModalOpen(true);
                        }}
                    >
                        Assign Program
                    </CommonButton>
                </div>
            )}

            {profile?.pending_profile_request?.status === 'Pending' && (
                <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-4 rounded-lg flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <ClockIcon size={28} className="text-(--mui-palette-info-main) shrink-0" />
                        <div>
                            <p className="font-semibold text-(--mui-palette-text-primary) text-sm m-0">
                                Profile Verification Pending Approval
                            </p>
                            <p className="text-(--mui-palette-text-secondary) text-xs m-0">
                                Your requested profile or program changes have been submitted to the Office of the Registrar for verification and approval.
                            </p>
                        </div>
                    </div>
                    <CommonButton
                        size="small"
                        variant="outlined"
                        onClick={function() {
                            navigate('/student/profile');
                        }}
                    >
                        View Status
                    </CommonButton>
                </div>
            )}

            <div className="gap-3 sm:gap-4 grid grid-cols-2 sm:grid-cols-3">
                {STAT_CARDS.map((card) => (
                    <StatCard
                        icon={card.icon}
                        iconBg={card.iconBg}
                        iconColor={card.iconColor}
                        key={card.label}
                        label={card.label}
                        to={card.to}
                        value={resolveStudentStatValue(dashboard, card.statKey)}
                    />
                ))}
            </div>

            <StudentInsightSummaryCard
                insight={insight}
                onViewInsight={handleViewInsight}
            />

            <CommonCard
                cardHeaderProps={{
                    subheader: 'Assessments that are open and not yet submitted.',
                    title: 'Upcoming Assessments'
                }}
                className="flex flex-col"
            >
                <div className="flex flex-col gap-2 p-4 pt-0">
                    {!dashboard?.upcoming_assessments?.length && (
                        <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                            No upcoming assessments.
                        </p>
                    )}
                    {dashboard?.upcoming_assessments?.map((assessment: UpcomingAssessment) => (
                        <div
                            className="border border-(--mui-palette-divider) flex gap-3 items-center justify-between p-3 rounded-lg"
                            key={assessment.id}
                        >
                            <div className="flex flex-col gap-1 min-w-0">
                                <div className="flex gap-2 items-center">
                                    <CommonBadgeStatus
                                        label={assessment.assessment_type}
                                        variant={ASSESSMENT_TYPE_VARIANT[assessment.assessment_type]}
                                    />
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {assessment.title}
                                    </span>
                                </div>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    {assessment.course_code} · {assessment.section_code}
                                    {assessment.due_at && (
                                        ` · Due ${new Date(assessment.due_at)
                                            .toLocaleString()}`
                                    )}
                                </span>
                            </div>
                            <CommonButton
                                size="small"
                                variant="contained"
                                onClick={function() {
                                    navigate(`/student/subjects/${assessment.enrollment_id}/assessments/${assessment.id}`);
                                }}
                            >
                                Take
                            </CommonButton>
                        </div>
                    ))}
                </div>
            </CommonCard>

            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                <AnnouncementsFeedCard
                    announcements={announcements}
                    error={announcementsError}
                />
                <EventsFeedCard
                    error={eventsError}
                    events={events}
                />
            </div>

            <InstitutionalIdentityCard />

            <AssignProgramModal
                currentProgramId={profile?.student?.program_id}
                currentYearLevel={profile?.student?.year_level}
                open={isAssignModalOpen}
                onClose={function() {
                    setIsAssignModalOpen(false);
                }}
                onSuccess={loadProfile}
            />

            <StudentProfilePromptModal
                currentProfile={profile}
                open={isPromptModalOpen}
                onClose={function() {
                    setIsPromptModalOpen(false);
                }}
                onSuccess={loadProfile}
            />
        </div>
    );
}