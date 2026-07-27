import StatCard from '@components/card/StatCard';
import AnnouncementsFeedCard from '@components/dashboard/AnnouncementsFeedCard';
import EventsFeedCard from '@components/dashboard/EventsFeedCard';
import useDashboardFeeds from '@hooks/useDashboardFeeds';
import {
    BookOpenIcon, CalendarCheckIcon, ChalkboardTeacherIcon, ClipboardTextIcon, GraduationCapIcon, SealCheckIcon
} from '@phosphor-icons/react';
import { getAdminDashboardStats } from '@services/admin.service';
import { AdminDashboardStats } from '@type/admin.type';
import { ReactNode, useEffect, useState } from 'react';

interface DashboardCard {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    statKey: keyof AdminDashboardStats;
    to?: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
    {
        icon: <GraduationCapIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-primary-50)]',
        iconColor: 'text-[var(--mui-palette-primary-main)]',
        label: 'Active Students',
        statKey: 'total_students',
        to: '/admin/users'
    },
    {
        icon: <ChalkboardTeacherIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-success-50)]',
        iconColor: 'text-[var(--mui-palette-success-main)]',
        label: 'Active Faculty',
        statKey: 'total_faculty',
        to: '/admin/users'
    },
    {
        icon: <BookOpenIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-secondary-50)]',
        iconColor: 'text-[var(--mui-palette-secondary-main)]',
        label: 'Total Programs',
        statKey: 'total_programs'
    },
    {
        icon: <CalendarCheckIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-info-50)]',
        iconColor: 'text-[var(--mui-palette-info-main)]',
        label: 'Active Terms',
        statKey: 'active_terms',
        to: '/admin/terms'
    },
    {
        icon: <ClipboardTextIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-warning-50)]',
        iconColor: 'text-[var(--mui-palette-warning-main)]',
        label: 'Active Enrollments',
        statKey: 'active_enrollments'
    },
    {
        icon: <SealCheckIcon size={24} />,
        iconBg: 'bg-[var(--mui-palette-error-50)]',
        iconColor: 'text-[var(--mui-palette-error-main)]',
        label: 'Pending Clearances',
        statKey: 'pending_clearances'
    }
];

export default function AdminDashboard() {
    const { announcements, events } = useDashboardFeeds();
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
            <div className="flex flex-col gap-1">
                <h1 className="font-semibold m-0 text-(--mui-palette-text-primary) text-2xl">
                    Dashboard
                </h1>
                <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                    Welcome to the AU-JAS LMS Admin Panel
                </p>
            </div>

            <div className="gap-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {DASHBOARD_CARDS.map((card) => (
                    <StatCard
                        icon={card.icon}
                        iconBg={card.iconBg}
                        iconColor={card.iconColor}
                        key={card.label}
                        label={card.label}
                        to={card.to}
                        value={stats
                            ? stats[card.statKey]
                            : '—'
                        }
                    />
                ))}
            </div>

            <div className="gap-4 grid grid-cols-1 xl:grid-cols-2">
                <AnnouncementsFeedCard announcements={announcements} />
                <EventsFeedCard events={events} />
            </div>
        </div>
    );
}