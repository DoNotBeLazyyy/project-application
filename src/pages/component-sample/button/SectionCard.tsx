import { DemoRowProps } from '@pages/component-sample/button/DemoRow';

export interface SectionCardProps extends DemoRowProps {
    // Section subtitle
    subtitle?: string;
}

/**
 * SectionCard
 *
 * A layout container used for grouping component demonstrations within a card-style UI.
 * Includes support for a title label and an optional descriptive subtitle.
 *
 * @example
 * <SectionCard
 * label="Standard Buttons"
 * subtitle="Examples of default button variants."
 * >
 *  <DemoRow label="Primary">
 *      <Button>Submit</Button>
 *  </DemoRow>
 * </SectionCard>
 */
export default function SectionCard({
    children,
    subtitle,
    label
}: SectionCardProps) {
    const cardClasses = 'bg-white border border-(--mui-tokens-color-neutral-200) rounded-[24px] shadow-[0px_8px_24px_0px_rgba(0,0,0,0.05)] p-6'; // Card container classes
    const headerClasses = 'flex flex-col gap-1 mb-5'; // Header section classes
    const labelClasses = 'text-[20px] font-bold leading-7 text-(--mui-tokens-color-neutral-900)'; // Title typography classes
    const subtitleClasses = 'text-[14px] leading-5 text-(--mui-tokens-color-neutral-500)'; // Subtitle typography classes

    return (
        <div className={cardClasses}>
            <div className={headerClasses}>
                <span className={labelClasses}>
                    {label}
                </span>
                {subtitle && (
                    <span className={subtitleClasses}>
                        {subtitle}
                    </span>
                )}
            </div>
            {children}
        </div>
    );
}