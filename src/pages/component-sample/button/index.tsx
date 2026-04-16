import CommonButton from '@components/button/CommonButton';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import DemoRow from '@pages/component-sample/button/DemoRow';
import SectionCard from '@pages/component-sample/button/SectionCard';
import VariantGroup from '@pages/component-sample/button/VariantGroup';
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';

export type ButtonColor = 'primary' | 'secondary';
export type ButtonSize = 'large' | 'medium' | 'small' | 'xsmall';
export type ButtonVariant = 'contained' | 'outlined' | 'text';

interface ButtonConfig {
    // Button color
    color: ButtonColor;
    // Display label
    label: string;
    // Button variant
    variant: ButtonVariant;
}

const BUTTON_SIZES: ButtonSize[] = ['xsmall', 'small', 'medium', 'large']; // List of button sizes
const BUTTON_CONFIGS: ButtonConfig[] = [
    { color: 'primary', label: 'Contained Primary', variant: 'contained' },
    { color: 'secondary', label: 'Contained Secondary', variant: 'contained' },
    { color: 'primary', label: 'Outlined Primary', variant: 'outlined' },
    { color: 'primary', label: 'Text (Ghost) Primary', variant: 'text' }
];

/**
 * CommonButtonSample
 *
 * A showcase page that demonstrates the various states, sizes, and variants of the CommonButton component.
 * It provides an organized layout for visual regression testing and design system reference.
 *
 * @example
 * <CommonButtonSample />
 */
export default function CommonButtonSample() {
    const pageContainerClasses = 'bg-[#F8FAFC] min-h-screen p-5 md:p-8'; // Outer page container classes
    const pageContentClasses = 'flex flex-col gap-8'; // Main content stack classes
    const headerWrapperClasses = 'flex flex-col gap-2'; // Header section wrapper classes
    const titleClasses = 'text-[#18181B] text-[28px] md:text-[36px] font-bold leading-[36px] md:leading-[44px]'; // Page title classes
    const descriptionClasses = 'text-[#52525B] text-[15px] font-normal leading-[24px] max-w-[900px]'; // Page description classes

    return (
        <div className={pageContainerClasses}>
            <div className={pageContentClasses}>
                <div className={headerWrapperClasses}>
                    <span className={titleClasses}>
                        CommonButton Display Page
                    </span>
                    <span className={descriptionClasses}>
                        This page displays the available CommonButton combinations in an organized layout,
                        grouped by usage, variant, size, icon position, loading state, and disabled state.
                    </span>
                </div>
                <SectionCard
                    label="Quick Preview"
                    subtitle="A quick preview of the most common button actions."
                >
                    <DemoRow label="Primary actions">
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<PlusIcon />}
                            variant="contained"
                        >
                            Create
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<SaveOutlinedIcon />}
                            variant="contained"
                        >
                            Save
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            endIcon={<DownloadOutlinedIcon />}
                            size="medium"
                            variant="contained"
                        >
                            Export
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Secondary actions">
                        <CommonButton
                            color="secondary"
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="contained"
                        >
                            Search
                        </CommonButton>
                        <CommonButton
                            color="secondary"
                            size="medium"
                            startIcon={<EditOutlinedIcon />}
                            variant="contained"
                        >
                            Edit
                        </CommonButton>
                        <CommonButton
                            color="secondary"
                            size="medium"
                            startIcon={<CalendarMonthOutlinedIcon />}
                            variant="contained"
                        >
                            Schedule
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Outline / ghost actions">
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
                            variant="outlined"
                        >
                            Delete
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            variant="text"
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<CircleNotchIcon className="animate-spin" />}
                            variant="outlined"
                        >
                            Processing
                        </CommonButton>
                    </DemoRow>
                </SectionCard>
                <SectionCard
                    label="Size Scale"
                    subtitle="All available sizes using the default primary button variant."
                >
                    <DemoRow label="Sizes">
                        {BUTTON_SIZES.map((size) => (
                            <CommonButton
                                color="primary"
                                key={`size-scale-${size}`}
                                size={size}
                                startIcon={<PlusIcon />}
                                variant="contained"
                            >
                                {size}
                            </CommonButton>
                        ))}
                    </DemoRow>
                </SectionCard>
                <SectionCard
                    label="State Reference"
                    subtitle="Reference examples for enabled, disabled, and loading button states."
                >
                    <DemoRow label="Enabled">
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<SaveOutlinedIcon />}
                            variant="contained"
                        >
                            Save Changes
                        </CommonButton>
                        <CommonButton
                            color="secondary"
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="contained"
                        >
                            Search Records
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
                            variant="outlined"
                        >
                            Remove
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            variant="text"
                        >
                            Back
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Disabled">
                        <CommonButton
                            color="primary"
                            disabled
                            size="medium"
                            startIcon={<SaveOutlinedIcon />}
                            variant="contained"
                        >
                            Save Changes
                        </CommonButton>
                        <CommonButton
                            color="secondary"
                            disabled
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="contained"
                        >
                            Search Records
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            disabled
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
                            variant="outlined"
                        >
                            Remove
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            disabled
                            size="medium"
                            variant="text"
                        >
                            Back
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Loading">
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<SaveOutlinedIcon />}
                            variant="contained"
                        >
                            Saving
                        </CommonButton>
                        <CommonButton
                            color="secondary"
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="contained"
                        >
                            Searching
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
                            variant="outlined"
                        >
                            Removing
                        </CommonButton>
                        <CommonButton
                            color="primary"
                            size="medium"
                            startIcon={<CalendarMonthOutlinedIcon />}
                            variant="text"
                        >
                            Loading
                        </CommonButton>
                    </DemoRow>
                </SectionCard>
                {BUTTON_CONFIGS.map((config) => (
                    <VariantGroup
                        color={config.color}
                        key={`${config.variant}-${config.color}`}
                        label={config.label}
                        variant={config.variant}
                    />
                ))}
            </div>
        </div>
    );
}