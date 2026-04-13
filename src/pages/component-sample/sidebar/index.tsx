import EgemcoIcon from '@assets/images/icons/egemco.png';
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList, { SideBarSection } from '@components/sidebar/CommonSideBarList';
import {
    HouseIcon, CalendarIcon, ClockIcon, BuildingsIcon, UsersIcon, CalendarDotsIcon, ClockUserIcon,
    DatabaseIcon,
    GlobeIcon
} from '@phosphor-icons/react';

export default function CommonSideBarSample() {

    const LIGHTSECTIONS: SideBarSection[] = [
        {
            sectionLabel: 'QUICK ACCESS',
            items: [
                { icon: <HouseIcon color= "#A1A1AA" />, label: 'Dashboard' },
                { icon: <CalendarIcon color="#A1A1AA"/>, label: 'Calendar' },
                { icon: <ClockIcon color="#A1A1AA" />, label: 'Time In / Time Out' }
            ]
        },
        {
            sectionLabel: 'MANAGEMENT',
            items: [
                {
                    icon: <BuildingsIcon color="#022179" />,
                    label: 'Organization',
                    defaultExpanded: true,
                    items: [
                        { label: 'Companies' },
                        { label: 'Departments' },
                        { label: 'Designations' }
                    ]
                },
                {
                    icon: <UsersIcon color="#022179"/>,
                    label: 'Users',
                    defaultExpanded: true,
                    items: [
                        { label: 'Employees' },
                        { label: 'Accounts' }
                    ]
                },
                {
                    icon: <CalendarDotsIcon color="#022179" />,
                    label: 'Attendance',
                    defaultExpanded: true,
                    items: [
                        { label: 'Overview' },
                        { label: 'Amendments' },
                        { label: 'Requests' },
                        { label: 'Overtime' },
                        { label: 'Leaves', isActive: true },
                        { label: 'Offset' }
                    ]
                },
                {
                    icon: <ClockUserIcon color="#022179"/>,
                    label: 'Shifts',
                    defaultExpanded: true,
                    items: [
                        { label: 'Overview' },
                        { label: 'Work From Home' }
                    ]
                }
            ]
        }
    ];// Light variant sections data for the sidebar

    const DARKSECTIONS: SideBarSection[] = [
        {
            sectionLabel: 'QUICK ACCESS',
            items: [
                { icon: <HouseIcon color="#D4D4D8" />, label: 'Dashboard' },
                { icon: <CalendarIcon color="#D4D4D8" />, label: 'Calendar' }
            ]
        },
        {
            sectionLabel: 'MANAGEMENT',
            items: [
                {
                    icon: <BuildingsIcon color="#387BE0" />,
                    label: 'Organization',
                    defaultExpanded: true,
                    items: [
                        { label: 'Companies' },
                        { label: 'Departments' },
                        { label: 'Designations' }
                    ]
                },
                {
                    icon: <GlobeIcon color="#387BE0" />,
                    label: 'Country Config',
                    defaultExpanded: true,
                    items: [
                        { label: 'Mandatory Deductions' },
                        { label: 'Pay Rates' },
                        { label: 'Holiday Rates' }
                    ]
                },
                {
                    icon: <DatabaseIcon color="#387BE0" />,
                    label: 'Data Management',
                    defaultExpanded: true,
                    items: [
                        { label: 'Holidays', isActive: true },
                        { label: 'Earnings' },
                        { label: 'Deductions' },
                        { label: 'Leave Types' },
                        { label: 'Weekly Shifts' }
                    ]
                },
                {
                    icon: <UsersIcon color="#387BE0" />,
                    label: 'Access Control',
                    defaultExpanded: true,
                    items: [
                        { label: 'Menu' },
                        { label: 'Roles' },
                        { label: 'Users' }
                    ]
                }
            ]
        }
    ]; // Dark variant sections data for the sidebar

    return (
        <div className="flex justify-between">
            <CommonSideBar
                // eslint-disable-next-line no-console
                footerProps={{ label: 'Settings', onClick: () => console.log('Settings') }}
                headerProps={{
                    logo: <img alt="logo" className="h-11 w-11 rounded-[20%] border-2 border-white/20" src={EgemcoIcon} />,
                    title: 'EGEMCO HRIS',
                    subtitle: 'Super User Access'
                }}
                variant="dark"
            >
                <CommonSideBarList
                    sections={DARKSECTIONS}
                    variant="dark"
                />
            </CommonSideBar>

            <CommonSideBar
                // eslint-disable-next-line no-console
                footerProps={{ label: 'Settings', onClick: () => console.log('Settings') }}
                headerProps={{
                    logo: <img alt="logo" className="h-11 w-11 rounded-[20%] border-2 border-white/20" src={EgemcoIcon} />,
                    title: 'EGEMCO HRIS',
                    subtitle: 'Super User Access'
                }}
                variant="light"
            >
                <CommonSideBarList
                    sections={LIGHTSECTIONS}
                    variant="light"
                />
            </CommonSideBar>
        </div>
    );
}