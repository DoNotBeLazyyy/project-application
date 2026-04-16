import CommonButton from '@components/button/CommonButton';
import { ButtonColor, ButtonSize, ButtonVariant } from '@pages/component-sample/button';
import DemoRow from '@pages/component-sample/button/DemoRow';
import SectionCard from '@pages/component-sample/button/SectionCard';
import { DownloadSimpleIcon, FloppyDiskIcon, PlusIcon } from '@phosphor-icons/react';

interface VariantGroupProps {
    // Button color
    color: ButtonColor;
    // Display label
    label: string;
    // Button variant
    variant: ButtonVariant;
}

const BUTTON_SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large']; // List of button sizes

/**
 * VariantGroup
 *
 * Groups and displays all sizes and states for a specific CommonButton variant and color combination.
 *
 * @example
 * <VariantGroup color="primary" label="Contained Primary" variant="contained" />
 */
export default function VariantGroup({ color, label, variant }: VariantGroupProps) {
    const subtitle = `CommonButton samples for the ${label.toLowerCase()}.`; // Dynamic section subtitle

    return (
        <SectionCard
            label={label}
            subtitle={subtitle}
        >
            <DemoRow label="Default">
                {BUTTON_SIZES.map((size) => (
                    <CommonButton
                        color={color}
                        key={`${variant}-${color}-${size}-default`}
                        size={size}
                        variant={variant}
                    >
                        {size}
                    </CommonButton>
                ))}
            </DemoRow>
            <DemoRow label="Disabled">
                {BUTTON_SIZES.map((size) => (
                    <CommonButton
                        color={color}
                        disabled
                        key={`${variant}-${color}-${size}-disabled`}
                        size={size}
                        variant={variant}
                    >
                        {size}
                    </CommonButton>
                ))}
            </DemoRow>
            <DemoRow label="Loading">
                {BUTTON_SIZES.map((size) => (
                    <CommonButton
                        color={color}
                        key={`${variant}-${color}-${size}-loading`}
                        size={size}
                        startIcon={<FloppyDiskIcon />}
                        variant={variant}
                    >
                        {size}
                    </CommonButton>
                ))}
            </DemoRow>
            <DemoRow label="With start icon">
                {BUTTON_SIZES.map((size) => (
                    <CommonButton
                        color={color}
                        key={`${variant}-${color}-${size}-start-icon`}
                        size={size}
                        startIcon={<PlusIcon />}
                        variant={variant}
                    >
                        Create
                    </CommonButton>
                ))}
            </DemoRow>
            <DemoRow label="With end icon">
                {BUTTON_SIZES.map((size) => (
                    <CommonButton
                        color={color}
                        endIcon={<DownloadSimpleIcon />}
                        key={`${variant}-${color}-${size}-end-icon`}
                        size={size}
                        variant={variant}
                    >
                        Export
                    </CommonButton>
                ))}
            </DemoRow>
        </SectionCard>
    );
}