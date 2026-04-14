import CommonButton from '@components/button/CommonButton';
import { ButtonSize, ButtonVariant } from '@pages/component-sample/button';
import DemoRow from '@pages/component-sample/button/DemoRow';
import SectionCard from '@pages/component-sample/button/SectionCard';
import { DownloadSimpleIcon, FloppyDiskIcon, PlusIcon } from '@phosphor-icons/react';

interface VariantGroupProps {
    // Button variant
    variant: ButtonVariant;
}

const BUTTON_SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large']; // List of button sizes

export default function VariantGroup({ variant }: VariantGroupProps) {
    return (
        <SectionCard
            label={`${variant} Variant`}
            subtitle={`CommonButton samples for the ${variant} variant.`}
        >
            <DemoRow label="Default">
                {BUTTON_SIZES.map((size) => (
                    <CommonButton
                        key={`${variant}-${size}-default`}
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
                        disabled
                        key={`${variant}-${size}-disabled`}
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
                        key={`${variant}-${size}-loading`}
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
                        key={`${variant}-${size}-start-icon`}
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
                        endIcon={<DownloadSimpleIcon />}
                        key={`${variant}-${size}-end-icon`}
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