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
import useDashboardFeeds from '@hooks/use-dashboard-feeds';
import {
    BookOpenIcon, CalendarCheckIcon, ClockIcon, GraduationCapIcon, UserFocusIcon
} from '@phosphor-icons/react';
import { getStudentInsight } from '@services/analytics.service';
import { getMyProfile } from '@services/profile.service';
import { getStudentDashboard } from '@services/student-portal.service';
import { useAppStore } from '@stores/app.store';
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
    const userProfile = useAppStore((s) => s.userProfile);
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
    const [dashboard, setDashboard] = useState<StudentDashboardData | null>(null);
    const [insight, setInsight] = useState<StudentInsight | null>(null);
    const [profile, setProfile] = useState<MyProfile | null>(null);
    const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);

    async function fetchStudentData() {
        const [dashboardResult, insightResult] = await Promise.all([
            getStudentDashboard(),
            getStudentInsight()
        ]);
        if (dashboardResult.data) setDashboard(dashboardResult.data);
        if (insightResult.data?.success) setInsight(insightResult.data);
    }

    async function loadProfile() {
        const result = await getMyProfile();
        if (result.data) setProfile(result.data);

        // Without a student record the dashboard/insight functions only return a
        // "profile not found" failure (shown as an error toast); the missing-profile
        // banner already covers that state, so skip them until the record exists.
        if (!result.data || result.data.student) {
            fetchStudentData();
        }
    }

    useEffect(function() {
        loadProfile();
    }, [userProfile?.profile_completed]);

    function handleViewInsight() {
        navigate('/student/insight');
    }

    return (
        <div className="flex flex-col gap-5">
            <DashboardHeader
                subtitle="Your classes, assessments, and grades at a glance."
                title="Dashboard"
            />

            {profile && profile.profile_completed !== false && !profile.student && (
                <div className="border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3.5 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                            <UserFocusIcon
                                size={24}
                                weight="bold"
                            />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base m-0">
                                Student Profile Missing
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-xs m-0 mt-0.5">
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
                <div className="border border-amber-200 dark:border-amber-800/80 bg-amber-50/70 dark:bg-amber-950/40 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3.5 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                            <GraduationCapIcon
                                size={24}
                                weight="bold"
                            />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base m-0">
                                Academic Program Not Assigned
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-xs m-0 mt-0.5">
                                You do not have an assigned academic program yet. Please select your degree program in the Curriculum Checklist to initialize your academic records.
                            </p>
                        </div>
                    </div>
                    <CommonButton
                        size="small"
                        variant="contained"
                        onClick={function() {
                            navigate('/student/curriculum');
                        }}
                    >
                        Go to Curriculum Checklist
                    </CommonButton>
                </div>
            )}

            {profile?.pending_profile_request?.status === 'Pending' && (
                <div className="border border-blue-200 dark:border-blue-800/80 bg-blue-50/70 dark:bg-blue-950/40 p-4 rounded-2xl flex items-center justify-between flex-wrap gap-3.5 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400">
                            <ClockIcon
                                size={24}
                                weight="bold"
                            />
                        </div>
                        <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base m-0">
                                Profile Verification Pending Approval
                            </p>
                            <p className="text-slate-600 dark:text-slate-400 text-xs m-0 mt-0.5">
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
                <div className="flex flex-col gap-2.5 p-4 pt-0">
                    {!dashboard?.upcoming_assessments?.length && (
                        <div className="py-8 text-center text-slate-500 dark:text-slate-400 text-sm italic">
                            No upcoming assessments at this time.
                        </div>
                    )}
                    {dashboard?.upcoming_assessments?.map((assessment: UpcomingAssessment) => (
                        <div
                            className="bg-slate-50/70 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between p-3.5 rounded-xl shadow-2xs hover:border-blue-400 dark:hover:border-blue-600 transition-all"
                            key={assessment.id}
                        >
                            <div className="flex flex-col gap-1 min-w-0 flex-1">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <CommonBadgeStatus
                                        label={assessment.assessment_type}
                                        variant={ASSESSMENT_TYPE_VARIANT[assessment.assessment_type]}
                                    />
                                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">
                                        {assessment.title}
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-mono font-medium text-blue-700 dark:text-blue-400">
                                        {assessment.course_code}
                                    </span>
                                    <span>·</span>
                                    <span>Section {assessment.section_code}</span>
                                    {assessment.due_at && (
                                        <>
                                            <span>·</span>
                                            <span className="flex items-center gap-1">
                                                <ClockIcon size={13} />
                                                Due {new Date(assessment.due_at)
                                                    .toLocaleString()}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <CommonButton
                                color="primary"
                                size="small"
                                variant="contained"
                                onClick={function() {
                                    navigate(`/student/subjects/${assessment.enrollment_id}/assessments/${assessment.id}`);
                                }}
                            >
                                Take Assessment
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