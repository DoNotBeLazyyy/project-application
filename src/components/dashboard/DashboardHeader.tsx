import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import CommonCard from '@components/card/CommonCard';
import { DashboardTerm } from '@type/dashboard.type';

interface DashboardHeaderProps {
    subtitle: string;
    term?: DashboardTerm | null;
    title: string;
}

export default function DashboardHeader({ subtitle, term, title }: DashboardHeaderProps) {
    return (
        <CommonCard>
            <div className="flex flex-wrap gap-3 items-start justify-between p-4 sm:p-5">
                <div className="flex flex-col gap-1">
                    <h1 className="font-semibold m-0 text-(--mui-palette-text-primary) text-xl sm:text-2xl">
                        {title}
                    </h1>
                    <p className="m-0 text-(--mui-palette-text-secondary) text-sm">
                        {subtitle}
                    </p>
                </div>
                {term && (
                    <div className="flex gap-2 items-center">
                        <span className="text-(--mui-palette-text-secondary) text-sm">
                            {term.term_label}
                        </span>
                        <CommonBadgeStatus
                            label={term.status}
                            variant="info"
                        />
                    </div>
                )}
            </div>
        </CommonCard>
    );
}