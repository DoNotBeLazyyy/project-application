import CommonNavbar from '@components/navbar/CommonNavbar';
import UserAccountMenu from '@components/navbar/UserAccountMenu';
import NotificationBell from '@components/notification/NotificationBell';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList from '@components/sidebar/CommonSideBarList';
import { resolvePanelLabel } from '@constants/role.constant';
import {
    BooksIcon, CalendarDotsIcon, ChartLineUpIcon, ClipboardTextIcon, ExamIcon, ListChecksIcon, SquaresFourIcon
} from '@phosphor-icons/react';
import { useAppStore } from '@stores/app.store';
import { SideBarSection } from '@type/sidebar.types';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

export default function StudentLayout() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const [isSidebarLocked, setIsSidebarLocked] = useState(false);
    const activeRole = useAppStore((s) => s.activeRole);
    const navSections = useMemo((): SideBarSection[] => [
        {
            sectionLabel: 'OVERVIEW',
            items: [
                {
                    icon: <SquaresFourIcon size={18} />,
                    isActive: pathname === '/student',
                    label: 'Dashboard',
                    onClick: () => navigate('/student')
                },
                {
                    icon: <CalendarDotsIcon size={18} />,
                    isActive: pathname === '/student/schedule',
                    label: 'Schedule',
                    onClick: () => navigate('/student/schedule')
                },
                {
                    icon: <BooksIcon size={18} />,
                    isActive: pathname === '/student/subjects',
                    label: 'Subject',
                    onClick: () => navigate('/student/subjects')
                },
                {
                    icon: <ExamIcon size={18} />,
                    isActive: pathname === '/student/grade',
                    label: 'Grade',
                    onClick: () => navigate('/student/grade')
                },
                {
                    icon: <ClipboardTextIcon size={18} />,
                    isActive: pathname.startsWith('/student/evaluations'),
                    label: 'Evaluate',
                    onClick: () => navigate('/student/evaluations')
                },
                {
                    icon: <ListChecksIcon size={18} />,
                    isActive: pathname === '/student/curriculum',
                    label: 'Curriculum',
                    onClick: () => navigate('/student/curriculum')
                },
                {
                    icon: <ChartLineUpIcon size={18} />,
                    isActive: pathname === '/student/insight',
                    label: 'Insight',
                    onClick: () => navigate('/student/insight')
                }
            ]
        }
    ], [pathname, navigate]);

    function handleToggleSidebar() {
        setIsSidebarLocked((prev) => !prev);
    }

    return (
        <div className="flex h-screen overflow-hidden w-full">
            <CommonSideBar
                footerProps={{
                    label: 'My Profile',
                    onClick: () => navigate('/student/profile')
                }}
                headerProps={{
                    subtitle: resolvePanelLabel(activeRole, 'Student'),
                    title: 'AU-JAS LMS'
                }}
                isOpen={isSidebarLocked}
                variant="dark"
                onToggleLock={handleToggleSidebar}
            >
                <CommonSideBarList
                    sections={navSections}
                    variant="dark"
                />
            </CommonSideBar>
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                <CommonNavbar
                    rightContent={
                        <div className="flex gap-3 items-center">
                            <NotificationBell />
                            <UserAccountMenu />
                        </div>
                    }
                />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}