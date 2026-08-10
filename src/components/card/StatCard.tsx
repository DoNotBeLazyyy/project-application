import CommonCard from '@components/card/CommonCard';
import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface StatCardProps {
    icon: ReactNode;
    iconBg: string;
    iconColor: string;
    label: string;
    to?: string;
    value: number | string;
}

export default function StatCard({
    icon,
    iconBg,
    iconColor,
    label,
    to,
    value
}: StatCardProps) {
    const navigate = useNavigate();
    const content = (
        <>
            <div
                className={`flex h-12 items-center justify-center rounded-xl w-12 ${iconBg}`}
            >
                <span className={`flex items-center justify-center ${iconColor}`}>
                    {icon}
                </span>
            </div>
            <div className="flex flex-col gap-0.5 text-left">
                <span className="font-bold text-2xl text-[var(--mui-palette-text-primary)]">
                    {value}
                </span>
                <span className="text-sm text-[var(--mui-palette-text-secondary)]">
                    {label}
                </span>
            </div>
        </>
    );

    function handleClick() {
        if (to) {
            navigate(to);
        }
    }

    if (!to) {
        return (
            <CommonCard>
                <div
                    className="cursor-default flex items-center gap-4 p-5"
                    title={`${label} is a read-only figure`}
                >
                    {content}
                </div>
            </CommonCard>
        );
    }

    return (
        <CommonCard>
            <button
                className="cursor-pointer flex gap-4 hover:bg-(--mui-palette-action-hover) items-center p-5 transition-colors w-full"
                type="button"
                onClick={handleClick}
            >
                {content}
            </button>
        </CommonCard>
    );
}