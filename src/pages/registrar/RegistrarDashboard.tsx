import CommonCard from '@components/card/CommonCard';
import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import {
    CaretRightIcon,
    ClipboardTextIcon,
    GraduationCapIcon,
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
        label: 'Course Enrollments This Term',
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
                    <div className="flex flex-col gap-2.5 p-4 pt-0">
                        {dashboard?.pending_releases.length === 0 && (
                            <p className="m-0 py-6 text-center text-(--mui-palette-text-secondary) text-sm">
                                No grades are waiting for release.
                            </p>
                        )}
                        {dashboard?.pending_releases.map((release) => (
                            <button
                                className="group w-full rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-white dark:hover:bg-zinc-800/80 p-3.5 transition-all shadow-2xs hover:shadow-xs hover:border-amber-400/70 dark:hover:border-amber-600/70 flex items-center justify-between gap-3 text-left cursor-pointer"
                                key={`${release.section_id}-${release.grading_period}`}
                                type="button"
                                onClick={function() {
                                    navigate('/registrar/grade-release');
                                }}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50">
                                        <SealCheckIcon
                                            size={20}
                                            weight="duotone"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                                            {release.course_code} · {release.section_code}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 text-xs truncate">
                                            {release.grading_period} · {release.faculty_name ?? 'Unassigned'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                                        {release.pending_count} pending
                                    </span>
                                    <CaretRightIcon
                                        className="text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all"
                                        size={16}
                                    />
                                </div>
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
                            <p className="m-0 py-6 text-center text-(--mui-palette-text-secondary) text-sm">
                                No enrollments recorded this term.
                            </p>
                        )}
                        {dashboard?.program_distribution.map((program) => {
                            const percent = totalEnrolled > 0
                                ? Math.round((program.student_count / totalEnrolled) * 100)
                                : 0;
                            return (
                                <div
                                    className="p-3 rounded-xl border border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/30 flex flex-col gap-2"
                                    key={program.program_code}
                                >
                                    <div className="flex gap-3 items-center justify-between">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 shrink-0">
                                                <GraduationCapIcon
                                                    size={16}
                                                    weight="duotone"
                                                />
                                            </div>
                                            <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">
                                                {program.program_code}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                                {program.student_count} <span className="font-normal text-slate-400 text-[11px]">students</span>
                                            </span>
                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 dark:bg-zinc-700 text-slate-600 dark:text-slate-300">
                                                {percent}%
                                            </span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-200/70 dark:bg-zinc-700/60 h-2 overflow-hidden rounded-full w-full">
                                        <div
                                            className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percent}%`
                                            }}
                                        />
                                    </div>
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