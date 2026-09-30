import CommonCard from '@components/card/CommonCard';
import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import {
    ClipboardTextIcon,
    HourglassIcon,
    SealCheckIcon,
    SignOutIcon,
    UsersThreeIcon
} from '@phosphor-icons/react';
import { getRegistrarDashboard } from '@services/dashboard.service';
import { RegistrarDashboard as RegistrarDashboardData, RegistrarDashboardStats } from '@type/dashboard.type';
import { resolveStatValue } from '@utils/dashboard.util';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface RegistrarStatCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: keyof RegistrarDashboardStats;
    to?: string;
}

const STAT_CARDS: RegistrarStatCard[] = [
    {
        icon: <UsersThreeIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-primary-50)]',
        iconColor: 'text-[var(--mui-palette-primary-main)]',
        label: 'Active Students',
        statKey: 'active_students',
        to: '/registrar/enrollment-management'
    },
    {
        icon: <ClipboardTextIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-info-50)]',
        iconColor: 'text-[var(--mui-palette-info-main)]',
        label: 'Enrollments This Term',
        statKey: 'enrollments_this_term',
        to: '/registrar/enrollment-management'
    },
    {
        icon: <SealCheckIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-warning-50)]',
        iconColor: 'text-[var(--mui-palette-warning-main)]',
        label: 'Pending Grade Releases',
        statKey: 'pending_grade_releases',
        to: '/registrar/grade-release'
    },
    {
        icon: <HourglassIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-error-50)]',
        iconColor: 'text-[var(--mui-palette-error-main)]',
        label: 'Incomplete Grades',
        statKey: 'incomplete_grades',
        to: '/registrar/grade-release'
    },
    {
        icon: <SignOutIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-error-50)]',
        iconColor: 'text-[var(--mui-palette-error-main)]',
        label: 'Dropped This Term',
        statKey: 'dropped_this_term',
        to: '/registrar/enrollment-management'
    }
];

export default function RegistrarDashboard() {
    const navigate = useNavigate();
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
    const [dashboard, setDashboard] = useState<RegistrarDashboardData | null>(null);

    useEffect(function() {
        async function fetchDashboard() {
            const result = await getRegistrarDashboard();
            if (result.data) setDashboard(result.data);
        }

        fetchDashboard();
    }, []);

    const totalEnrolled = dashboard?.program_distribution.reduce(
        (sum, program) => sum + program.student_count,
        0
    ) ?? 0;

    return (
        <div className="flex flex-col gap-6">
            <DashboardHeader
                subtitle="Enrollment and records operations."
                term={dashboard?.term}
                title="Dashboard"
            />

            <div className="gap-3 sm:gap-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
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
                        subheader: 'Grades submitted or approved but not yet released.',
                        title: 'Awaiting Grade Release'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-2 p-4 pt-0">
                        {dashboard?.pending_releases.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No grades are waiting for release.
                            </p>
                        )}
                        {dashboard?.pending_releases.map((release) => (
                            <button
                                className="border border-(--mui-palette-divider) cursor-pointer flex gap-3 items-center justify-between p-3 rounded-lg text-left"
                                key={`${release.section_id}-${release.grading_period}`}
                                type="button"
                                onClick={function() {
                                    navigate('/registrar/grade-release');
                                }}
                            >
                                <div className="flex flex-col gap-0.5 min-w-0">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {release.course_code} · {release.section_code}
                                    </span>
                                    <span className="text-(--mui-palette-text-secondary) text-xs truncate">
                                        {release.grading_period} · {release.faculty_name ?? 'Unassigned'}
                                    </span>
                                </div>
                                <span className="font-semibold shrink-0 text-(--mui-palette-warning-main) text-sm">
                                    {release.pending_count} pending
                                </span>
                            </button>
                        ))}
                    </div>
                </CommonCard>

                <CommonCard
                    cardHeaderProps={{
                        subheader: 'Enrolled students by program this term.',
                        title: 'Enrollment Distribution'
                    }}
                    className="flex flex-col"
                >
                    <div className="flex flex-col gap-3 p-4 pt-0">
                        {dashboard?.program_distribution.length === 0 && (
                            <p className="m-0 py-4 text-(--mui-palette-text-secondary) text-sm">
                                No enrollments recorded this term.
                            </p>
                        )}
                        {dashboard?.program_distribution.map((program) => (
                            <div
                                className="flex flex-col gap-1"
                                key={program.program_code}
                            >
                                <div className="flex gap-3 items-center justify-between">
                                    <span className="font-medium text-(--mui-palette-text-primary) text-sm truncate">
                                        {program.program_code}
                                    </span>
                                    <span className="shrink-0 text-(--mui-palette-text-secondary) text-xs">
                                        {program.student_count}
                                    </span>
                                </div>
                                <div className="bg-(--mui-palette-divider) h-2 overflow-hidden rounded-full w-full">
                                    <div
                                        className="bg-(--mui-palette-primary-main) h-full rounded-full"
                                        style={{
                                            width: totalEnrolled > 0
                                                ? `${(program.student_count / totalEnrolled) * 100}%`
                                                : '0%'
                                        }}
                                    />
                                </div>
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