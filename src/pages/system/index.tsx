/* eslint-disable no-console */
import CommonSideBar from '@components/sidebar/CommonSideBar';
import CommonSideBarList, { SideBarSection } from '@components/sidebar/CommonSideBarList';
import EgemcoIcon from '@assets/images/icons/egemco.png';
import {
    CalendarBlank,
    Buildings,
    Database,
    Flag,
    List,
    SquaresFour,
    BuildingIcon,
    CalendarIcon,
    DatabaseIcon,
    GlobeIcon,
    UserIcon,
    BuildingsIcon
} from '@phosphor-icons/react';
import { useState } from 'react';
import HomeSidBarIcon from '@components/icons/HomeSidBarIcon';

export default function SystemRoot() {
    const [isSideBarOpen, setIsSideBarOpen] = useState(true);

    const SECTIONS: SideBarSection[] = [
        {
            sectionLabel: 'QUICK ACCESS',
            items: [
                { icon: <HomeSidBarIcon />, label: 'Dashboard' },
                { icon: <CalendarIcon />, label: 'Calendar' }
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
                    icon: <UserIcon color="#387BE0" />,
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
    ];

    return (
        <div className="flex">
            <CommonSideBar
                footerProps={{ onClick: () => console.log('Settings') }}
                headerProps={{
                    logo: <img alt="logo" className="h-11 w-11 rounded-[20%] border-2 border-white/20" src={EgemcoIcon} />,
                    title: 'EGEMCO HRIS',
                    subtitle: 'Super User Access'
                }}
                isOpen={isSideBarOpen}
                variant="dark"
            >
                <CommonSideBarList
                    sections={SECTIONS}
                    variant="dark"
                />
            </CommonSideBar>

            {/* Main content */}
            <div className="flex-1 p-6">
                <h1>Page Content</h1>
            </div>
        </div>
    );
}