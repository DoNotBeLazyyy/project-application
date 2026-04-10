import CommonButton from '@components/button/CommonButton';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { BUTTON_SIZES, BUTTON_VARIANTS } from '@pages/component-sample/button/constant';
import DemoRow from '@pages/component-sample/button/DemoRow';
import SectionCard from '@pages/component-sample/button/SectionCard';
import VariantGroup from '@pages/component-sample/button/VariantGroup';
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';

export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'ghost';

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

    const plusIcon = <PlusIcon />; // Plus icon element
    const saveIcon = <SaveOutlinedIcon />; // Save icon element
    const downloadIcon = <DownloadOutlinedIcon />; // Download icon element
    const searchIcon = <SearchOutlinedIcon />; // Search icon element
    const editIcon = <EditOutlinedIcon />; // Edit icon element
    const calendarIcon = <CalendarMonthOutlinedIcon />; // Calendar icon element
    const deleteIcon = <DeleteOutlineIcon />; // Delete icon element
    const loadingIcon = <CircleNotchIcon className="animate-spin" />; // Loading spinner icon element

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
                            size="medium"
                            startIcon={plusIcon}
                            variant="primary"
                        >
                            Create
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={saveIcon}
                            variant="primary"
                        >
                            Save
                        </CommonButton>
                        <CommonButton
                            endIcon={downloadIcon}
                            size="medium"
                            variant="primary"
                        >
                            Export
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Secondary actions">
                        <CommonButton
                            size="medium"
                            startIcon={searchIcon}
                            variant="secondary"
                        >
                            Search
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={editIcon}
                            variant="secondary"
                        >
                            Edit
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={calendarIcon}
                            variant="secondary"
                        >
                            Schedule
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Outline / ghost actions">
                        <CommonButton
                            size="medium"
                            startIcon={deleteIcon}
                            variant="outlined"
                        >
                            Delete
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            variant="ghost"
                        >
                            Cancel
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={loadingIcon}
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
                                key={`size-scale-${size}`}
                                size={size}
                                startIcon={plusIcon}
                                variant="primary"
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
                            size="medium"
                            startIcon={saveIcon}
                            variant="primary"
                        >
                            Save Changes
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={searchIcon}
                            variant="secondary"
                        >
                            Search Records
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={deleteIcon}
                            variant="outlined"
                        >
                            Remove
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            variant="ghost"
                        >
                            Back
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Disabled">
                        <CommonButton
                            disabled
                            size="medium"
                            startIcon={saveIcon}
                            variant="primary"
                        >
                            Save Changes
                        </CommonButton>
                        <CommonButton
                            disabled
                            size="medium"
                            startIcon={searchIcon}
                            variant="secondary"
                        >
                            Search Records
                        </CommonButton>
                        <CommonButton
                            disabled
                            size="medium"
                            startIcon={deleteIcon}
                            variant="outlined"
                        >
                            Remove
                        </CommonButton>
                        <CommonButton
                            disabled
                            size="medium"
                            variant="ghost"
                        >
                            Back
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Loading">
                        <CommonButton
                            size="medium"
                            startIcon={saveIcon}
                            variant="primary"
                        >
                            Saving
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={searchIcon}
                            variant="secondary"
                        >
                            Searching
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={deleteIcon}
                            variant="outlined"
                        >
                            Removing
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={calendarIcon}
                            variant="ghost"
                        >
                            Loading
                        </CommonButton>
                    </DemoRow>
                </SectionCard>
                {BUTTON_VARIANTS.map((variant) => (
                    <VariantGroup
                        key={variant}
                        variant={variant}
                    />
                ))}
            </div>
        </div>
    );
}