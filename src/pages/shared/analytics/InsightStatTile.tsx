interface InsightStatTileProps {
    hint?: string;
    label: string;
    value: string;
}

export default function InsightStatTile({ hint, label, value }: InsightStatTileProps) {
    return (
        <div className="border border-(--mui-palette-divider) flex flex-col gap-0.5 p-3 rounded-lg">
            <span className="text-(--mui-palette-text-secondary) text-xs uppercase">
                {label}
            </span>
            <span className="font-semibold text-(--mui-palette-text-primary) text-lg">
                {value}
            </span>
            {hint && (
                <span className="text-(--mui-palette-text-secondary) text-xs">
                    {hint}
                </span>
            )}
        </div>
    );
}