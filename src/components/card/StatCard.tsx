import CommonCard from '@components/card/CommonCard';
import { ReactNode } from 'react';

interface StatCardProps {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    value: number | string;
}

export default function StatCard({
    icon,
    iconBg,
    iconColor,
    label,
    value
}: StatCardProps) {
    return (
        <CommonCard>
            <div className="flex items-center gap-4 p-5">
                <div
                    className={`flex h-12 items-center justify-center rounded-xl w-12 ${iconBg}`}
                >
                    <span className={`flex items-center justify-center ${iconColor}`}>
                        {icon}
                    </span>
                </div>
                <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-2xl text-[var(--mui-palette-text-primary)]">
                        {value}
                    </span>
                    <span className="text-sm text-[var(--mui-palette-text-secondary)]">
                        {label}
                    </span>
                </div>
            </div>
        </CommonCard>
    );
}