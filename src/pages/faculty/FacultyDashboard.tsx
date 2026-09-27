import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonCard from '@components/card/CommonCard';
import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import {
    CalendarCheckIcon,
    ClipboardTextIcon,
    ClockIcon,
    FileTextIcon,
    StackIcon,
    UsersThreeIcon,
    WarningCircleIcon
} from '@phosphor-icons/react';
import { getFacultyDashboard } from '@services/dashboard.service';
import { RiskLevel } from '@type/analytics.type';
import { FacultyDashboard as FacultyDashboardData, FacultyDashboardStats } from '@type/dashboard.type';
import { resolveStatValue } from '@utils/dashboard.util';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RISK_VARIANT: Record<RiskLevel, 'success' | 'warning' | 'error'> = {
    Low: 'success',
    Moderate: 'warning',
    High: 'error'
};

interface FacultyStatCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: keyof FacultyDashboardStats;
    to?: string;
}

const STAT_CARDS: FacultyStatCard[] = [
    {
        icon: <StackIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-primary-50)]',
        iconColor: 'text-[var(--mui-palette-primary-main)]',
        label: 'My Sections',
        statKey: 'my_sections',
        to: '/faculty/sections'
    },
    {
        icon: <UsersThreeIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-info-50)]',
        iconColor: 'text-[var(--mui-palette-info-main)]',
        label: 'Total Students',
        statKey: 'total_students',
        to: '/faculty/sections'
    },
    {
        icon: <ClipboardTextIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-warning-50)]',
        iconColor: 'text-[var(--mui-palette-warning-main)]',
        label: 'Pending Grading',
        statKey: 'pending_grading',
        to: '/faculty/sections'
    },
    {
        icon: <WarningCircleIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-error-50)]',
        iconColor: 'text-[var(--mui-palette-error-main)]',
        label: 'At-Risk Students',
        statKey: 'at_risk_students',
        to: '/faculty/sections'
    },
    {
        icon: <FileTextIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-secondary-50)]',
        iconColor: 'text-[var(--mui-palette-secondary-main)]',
        label: 'Published Assessments',
        statKey: 'published_assessments',
        to: '/faculty/sections'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-success-50)]',
        iconColor: 'text-[var(--mui-palette-success-main)]',
        label: 'Classes Today',
        statKey: 'sessions_today',
        to: '/faculty/sections'
    }
];

function formatTime(value: string): string {
    return value.slice(0, 5);
}

export default function FacultyDashboard() {
    const navigate = useNavigate();
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
    const [dashboard, setDashboard] = useState<FacultyDashboardData | null>(null);

    useEffect(function() {
        async function fetchDashboard() {
            const result = await getFacultyDashboard();
            if (result.data) setDashboard(result.data);
        }

        fetchDashboard();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <DashboardHeader
                subtitle="Your teaching load and what needs attention."
                term={dashboard?.term}
                title="Dashboard"
            />

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {STAT_CARDS.map((card) => (
                    <StatCard
                        icon={card.icon}
                        iconBg={card.iconBg}
                        iconColor={card.iconColor}
                        key={card.label}
                        label={card.label}
                        to={card.to}
                        value={resolveStatValue(dashboard?.stats?.[card.statKey])}
                    />
                ))}
            </div>

            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Sessions scheduled for today.',
                        title: 'Today\'s Classes'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {dashboard?.todays_classes.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No classes scheduled today.
                            </p>
                        )}
                        {dashboard?.todays_classes.map((session) => (
                            <button
                                className="border border-(--mui-palette-divider) cursor-pointer flex gap-3 items-center justify-between p-3 rounded-lg text-left"
                                key={`${session.section_id}-${session.time_start}`}
                                type="button"
                                onClick={function() {
                                    navigate(`/faculty/sections/${session.section_id}`);
                                }}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {session.course_code} · {session.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {session.course_title}
                                        {session.room && ` · ${session.room}`}
                                    </span>
                                </div>
                                <span className="flex gap-1 items-center shrink-0 text-(--mui-palette-text-secondary) text-xs">
                                    <ClockIcon size={14} />
                                    {formatTime(session.time_start)} - {formatTime(session.time_end)}
                                </span>
                            </button>
                        ))}
                    </div>
                </CommonCard>

                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Submissions waiting to be graded.',
                        title: 'Pending Grading'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {dashboard?.pending_grading.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                Nothing is waiting to be graded.
                            </p>
                        )}
                        {dashboard?.pending_grading.map((assessment) => (
                            <button
                                className="border border-(--mui-palette-divider) cursor-pointer flex gap-3 items-center justify-between p-3 rounded-lg text-left"
                                key={assessment.assessment_id}
                                type="button"
                                onClick={function() {
                                    navigate(`/faculty/sections/${assessment.section_id}/assessments/${assessment.assessment_id}/submissions`);
                                }}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {assessment.title}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {assessment.course_code} · {assessment.section_code} · {assessment.assessment_type}
                                    </span>
                                </div>
                                <span className="font-semibold shrink-0 text-(--mui-palette-warning-main) text-sm">
                                    {assessment.ungraded_count} ungraded
                                </span>
                            </button>
                        ))}
                    </div>
                </CommonCard>
            </div>

            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Class size, at-risk count, and average score.',
                        title: 'My Sections'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {dashboard?.sections.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                You have no sections this term.
                            </p>
                        )}
                        {dashboard?.sections.map((section) => (
                            <button
                                className="border border-(--mui-palette-divider) cursor-pointer flex gap-3 items-center justify-between p-3 rounded-lg text-left"
                                key={section.section_id}
                                type="button"
                                onClick={function() {
                                    navigate(`/faculty/sections/${section.section_id}`);
                                }}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {section.course_code} · {section.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {section.enrolled_count} students
                                        {section.avg_score_pct !== null && ` · Avg ${section.avg_score_pct}%`}
                                    </span>
                                </div>
                                {section.at_risk_count > 0 && (
                                    <span className="font-semibold shrink-0 text-(--mui-palette-error-main) text-sm">
                                        {section.at_risk_count} at risk
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </CommonCard>

                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Track student academic performance, at-risk alerts, and Dean\'s List contenders.',
                        title: 'Achievement & Early Warning Radar'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-3 p-4 pt-0">
                        {dashboard?.at_risk_students.length === 0 && (
                            <div className="border border-(--mui-palette-divider) flex flex-col gap-1 p-4 rounded-lg bg-(--mui-palette-success-main)/5 text-center">
                                <span className="font-semibold text-(--mui-palette-success-main) text-sm">
                                    All Students On Track
                                </span>
                                <span className="text-(--mui-palette-text-secondary) text-xs">
                                    No students currently fall below academic safety thresholds.
                                </span>
                            </div>
                        )}
                        {dashboard?.at_risk_students.map((student) => {
                            const isHighRisk = student.risk_level === 'High';
                            const missingAlert = student.missing_count >= 2;

                            return (
                                <div
                                    className="border border-(--mui-palette-divider) flex gap-3 items-center justify-between p-3 rounded-lg hover:border-(--mui-palette-primary-main) transition-colors cursor-pointer"
                                    key={student.enrollment_id}
                                    onClick={() => navigate(`/faculty/sections/${student.section_id}?tab=students`)}
                                >
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="flex gap-2 items-center">
                                            <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                                {student.full_name}
                                            </span>
                                            <span className="text-(--mui-palette-text-disabled) text-xs">
                                                ({student.student_number})
                                            </span>
                                        </div>
                                        <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                            {student.course_code} · {student.section_code}
                                            {student.avg_score_pct !== null && ` · Avg ${student.avg_score_pct}%`}
                                            {missingAlert && ` · ${student.missing_count} Missing Assessments`}
                                        </span>
                                    </div>
                                    <CommonBadgeStatus
                                        label={missingAlert ? `${student.risk_level} (${student.missing_count} missing)` : student.risk_level}
                                        variant={RISK_VARIANT[student.risk_level]}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </CommonCard>
            </div>

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
        </div>
    );
}