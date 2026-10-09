import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import DashboardHeader from '@components/dashboard/DashboardHeader';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import {
    CalendarCheckIcon, ChalkboardTeacherIcon, GraduationCapIcon
} from '@phosphor-icons/react';
import { getAdminDashboardStats } from '@services/admin.service';
import { AdminDashboardStats } from '@type/admin.type';
import { resolveStatValue } from '@utils/dashboard.util';
import { ReactNode, useEffect, useState } from 'react';

interface DashboardCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: keyof AdminDashboardStats;
    to: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
    {
        icon: <GraduationCapIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-primary-50)]',
        iconColor: 'text-[var(--mui-palette-primary-main)]',
        label: 'Active Students',
        statKey: 'total_students',
        to: '/admin/users?role=Student&status=Active'
    },
    {
        icon: <ChalkboardTeacherIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-success-50)]',
        iconColor: 'text-[var(--mui-palette-success-main)]',
        label: 'Active Faculty',
        statKey: 'total_faculty',
        to: '/admin/users?role=Faculty&status=Active'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-info-50)]',
        iconColor: 'text-[var(--mui-palette-info-main)]',
        label: 'Active Terms',
        statKey: 'active_terms',
        to: '/admin/school-years'
    }
];

export default function AdminDashboard() {
    const {
        announcements,
        announcementsError,
        events,
        eventsError
    } = useDashboardFeeds();
    const [stats, setStats] = useState<AdminDashboardStats | null>(null);

    useEffect(() => {
        async function fetchStats() {
            const result = await getAdminDashboardStats();
            if (result.data) {
                setStats(result.data);
            }
        }
        fetchStats();
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <DashboardHeader
                subtitle="Welcome to the AU-JAS LMS Admin Panel"
                title="Dashboard"
            />

            <div className="gap-3 sm:gap-4 grid grid-cols-1 sm:grid-cols-3">
                {DASHBOARD_CARDS.map((card) => (
                    <StatCard
                        icon={card.icon}
                        iconBg={card.iconBg}
                        iconColor={card.iconColor}
                        key={card.label}
                        label={card.label}
                        to={card.to}
                        value={resolveStatValue(stats?.[card.statKey])}
                    />
                ))}
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