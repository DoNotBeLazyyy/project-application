import CommonCard from '@components/card/CommonCard';
import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import {
    BookOpenIcon,
    ChalkboardTeacherIcon,
    GraduationCapIcon,
    StackIcon,
    UserMinusIcon,
    UsersThreeIcon,
    WarningCircleIcon,
    WarningIcon
} from '@phosphor-icons/react';
import { getDeanDashboard } from '@services/dashboard.service';
import { DeanDashboard as DeanDashboardData, DeanDashboardStats } from '@type/dashboard.type';
import { resolveStatValue } from '@utils/dashboard.util';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface DeanStatCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: keyof DeanDashboardStats;
    to?: string;
}

const STAT_CARDS: DeanStatCard[] = [
    {
        icon: <GraduationCapIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-secondary-50)]',
        iconColor: 'text-[var(--mui-palette-secondary-main)]',
        label: 'Programs',
        statKey: 'total_programs',
        to: '/dean/program-management'
    },
    {
        icon: <BookOpenIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-info-50)]',
        iconColor: 'text-[var(--mui-palette-info-main)]',
        label: 'Courses',
        statKey: 'total_courses',
        to: '/dean/course-management'
    },
    {
        icon: <StackIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-success-50)]',
        iconColor: 'text-[var(--mui-palette-success-main)]',
        label: 'Sections This Term',
        statKey: 'sections_this_term',
        to: '/dean/section-management'
    },
    {
        icon: <UsersThreeIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-primary-50)]',
        iconColor: 'text-[var(--mui-palette-primary-main)]',
        label: 'Enrolled Students',
        statKey: 'enrolled_students',
        to: '/dean/section-management'
    },
    {
        icon: <ChalkboardTeacherIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-secondary-50)]',
        iconColor: 'text-[var(--mui-palette-secondary-main)]',
        label: 'Faculty',
        statKey: 'total_faculty',
        to: '/dean/faculty-load'
    },
    {
        icon: <UserMinusIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-warning-50)]',
        iconColor: 'text-[var(--mui-palette-warning-main)]',
        label: 'Unassigned Sections',
        statKey: 'unassigned_sections',
        to: '/dean/section-management'
    },
    {
        icon: <WarningIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-error-50)]',
        iconColor: 'text-[var(--mui-palette-error-main)]',
        label: 'Schedule Conflicts',
        statKey: 'schedule_conflicts',
        to: '/dean/schedule-conflicts'
    },
    {
        icon: <WarningCircleIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-error-50)]',
        iconColor: 'text-[var(--mui-palette-error-main)]',
        label: 'At-Risk Students',
        statKey: 'at_risk_students',
        to: '/dean/section-management'
    }
];

export default function DeanDashboard() {
    const navigate = useNavigate();
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
    const [dashboard, setDashboard] = useState<DeanDashboardData | null>(null);

    useEffect(function() {
        async function fetchDashboard() {
            const result = await getDeanDashboard();
            if (result.data) setDashboard(result.data);
        }

        fetchDashboard();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <DashboardHeader
                subtitle="Academic architecture at a glance."
                term={dashboard?.term}
                title="Dashboard"
            />

            <div className="gap-3 sm:gap-4 grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
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
                        subheader: 'Sections in this term with no faculty assigned.',
                        title: 'Needs a Faculty Assignment'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {dashboard?.unassigned_sections.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                Every section in this term has a faculty assigned.
                            </p>
                        )}
                        {dashboard?.unassigned_sections.map((section) => (
                            <button
                                className="border border-(--mui-palette-divider) cursor-pointer flex gap-3 items-center justify-between p-3 rounded-lg text-left"
                                key={section.section_id}
                                type="button"
                                onClick={function() {
                                    navigate('/dean/section-management');
                                }}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {section.course_code} · {section.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {section.course_title}
                                    </span>
                                </div>
                                <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs">
                                    {section.enrolled_count} enrolled
                                </span>
                            </button>
                        ))}
                    </div>
                </CommonCard>

                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Sections carrying the most at-risk students.',
                        title: 'Insight Highlights'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {dashboard?.at_risk_sections.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No at-risk students detected this term.
                            </p>
                        )}
                        {dashboard?.at_risk_sections.map((section) => (
                            <div
                                className="border border-(--mui-palette-divider) flex gap-3 items-center justify-between p-3 rounded-lg"
                                key={section.section_id}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {section.course_code} · {section.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {section.faculty_name ?? 'Unassigned'}
                                        {section.avg_score_pct !== null && (
                                            ` · Avg ${section.avg_score_pct}%`
                                        )}
                                    </span>
                                </div>
                                <span className="font-semibold shrink-0 text-(--mui-palette-error-main) text-sm">
                                    {section.at_risk_count}/{section.enrolled_count} at risk
                                </span>
                            </div>
                        ))}
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