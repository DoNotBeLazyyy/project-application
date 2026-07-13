import { InsightTrendPoint } from '@type/analytics.type';

interface GwaTrendChartProps {
    points: InsightTrendPoint[];
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 160;
const PADDING_X = 32;
const PADDING_Y = 20;
const BEST_GWA = 1;
const WORST_GWA = 5;

function toY(gwa: number): number {
    const ratio = (gwa - BEST_GWA) / (WORST_GWA - BEST_GWA);

    return PADDING_Y + ratio * (CHART_HEIGHT - PADDING_Y * 2);
}

function toX(index: number, total: number): number {
    if (total <= 1) return CHART_WIDTH / 2;

    return PADDING_X + index * ((CHART_WIDTH - PADDING_X * 2) / (total - 1));
}

export default function GwaTrendChart({ points }: GwaTrendChartProps) {
    const plotted = points.filter(function(point) {
        return point.gwa !== null;
    });

    if (plotted.length === 0) {
        return (
            <p className="text-(--mui-palette-text-secondary) text-sm">
                No released term grades yet. Your trend appears once grades are released.
            </p>
        );
    }

    const line = plotted.map(function(point, index) {
        return `${toX(index, plotted.length)},${toY(Number(point.gwa))}`;
    })
        .join(' ');

    return (
        <div className="overflow-x-auto w-full">
            <svg
                aria-label="Grade weighted average per term"
                height={CHART_HEIGHT + 28}
                role="img"
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT + 28}`}
                width="100%"
            >
                {[1, 2, 3].map(function(gridGwa) {
                    return (
                        <g key={gridGwa}>
                            <line
                                stroke="var(--mui-palette-divider)"
                                strokeDasharray="4 4"
                                x1={PADDING_X}
                                x2={CHART_WIDTH - PADDING_X}
                                y1={toY(gridGwa)}
                                y2={toY(gridGwa)}
                            />
                            <text
                                fill="var(--mui-palette-text-secondary)"
                                fontSize="10"
                                x={0}
                                y={toY(gridGwa) + 3}
                            >
                                {gridGwa.toFixed(2)}
                            </text>
                        </g>
                    );
                })}
                {plotted.length > 1 && (
                    <polyline
                        fill="none"
                        points={line}
                        stroke="var(--mui-palette-primary-main)"
                        strokeWidth="2"
                    />
                )}
                {plotted.map(function(point, index) {
                    return (
                        <g key={point.term_id}>
                            <circle
                                cx={toX(index, plotted.length)}
                                cy={toY(Number(point.gwa))}
                                fill="var(--mui-palette-primary-main)"
                                r="4"
                            />
                            <text
                                fill="var(--mui-palette-text-primary)"
                                fontSize="10"
                                textAnchor="middle"
                                x={toX(index, plotted.length)}
                                y={toY(Number(point.gwa)) - 10}
                            >
                                {Number(point.gwa)
                                    .toFixed(2)}
                            </text>
                            <text
                                fill="var(--mui-palette-text-secondary)"
                                fontSize="10"
                                textAnchor="middle"
                                x={toX(index, plotted.length)}
                                y={CHART_HEIGHT + 16}
                            >
                                {point.term_label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}