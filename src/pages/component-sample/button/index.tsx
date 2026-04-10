import CommonButton from '@components/button/CommonButton';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import { Box, Stack, Typography } from '@mui/material';
import { BUTTON_SIZES, BUTTON_VARIANTS } from '@pages/component-sample/button/constant';
import DemoRow from '@pages/component-sample/button/DemoRow';
import SectionCard from '@pages/component-sample/button/SectionCard';
import VariantGroup from '@pages/component-sample/button/VariantGroup';
import { CircleNotchIcon, PlusIcon } from '@phosphor-icons/react';

export type ButtonSize = 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge';
export type ButtonVariant = 'primary' | 'secondary' | 'outlined' | 'ghost';

export default function CommonButtonSample() {
    return (
        <Box
            sx={{
                backgroundColor: '#F8FAFC',
                minHeight: '100vh',
                p: {
                    xs: '20px',
                    md: '32px'
                }
            }}
        >
            <Stack spacing={4}>
                <Box>
                    <Typography
                        sx={{
                            color: '#18181B',
                            fontSize: {
                                xs: '28px',
                                md: '36px'
                            },
                            fontWeight: 700,
                            lineHeight: {
                                xs: '36px',
                                md: '44px'
                            },
                            mb: '8px'
                        }}
                    >
                        CommonButton Display Page
                    </Typography>
                    <Typography
                        sx={{
                            color: '#52525B',
                            fontSize: '15px',
                            fontWeight: 400,
                            lineHeight: '24px',
                            maxWidth: '900px'
                        }}
                    >
                        This page displays the available CommonButton combinations in an organized layout,
                        grouped by usage, variant, size, icon position, loading state, and disabled state.
                    </Typography>
                </Box>
                <SectionCard
                    label="Quick Preview"
                    subtitle="A quick preview of the most common button actions."
                >
                    <DemoRow label="Primary actions">
                        <CommonButton
                            size="medium"
                            startIcon={<PlusIcon />}
                            variant="primary"
                        >
                            Create
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<SaveOutlinedIcon />}
                            variant="primary"
                        >
                            Save
                        </CommonButton>
                        <CommonButton
                            endIcon={<DownloadOutlinedIcon />}
                            size="medium"
                            variant="primary"
                        >
                            Export
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Secondary actions">
                        <CommonButton
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="secondary"
                        >
                            Search
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<EditOutlinedIcon />}
                            variant="secondary"
                        >
                            Edit
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<CalendarMonthOutlinedIcon />}
                            variant="secondary"
                        >
                            Schedule
                        </CommonButton>
                    </DemoRow>
                    <DemoRow label="Outline / ghost actions">
                        <CommonButton
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
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
                                key={`size-scale-${size}`}
                                size={size}
                                startIcon={<PlusIcon />}
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
                            startIcon={<SaveOutlinedIcon />}
                            variant="primary"
                        >
                            Save Changes
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="secondary"
                        >
                            Search Records
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
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
                            startIcon={<SaveOutlinedIcon />}
                            variant="primary"
                        >
                            Save Changes
                        </CommonButton>
                        <CommonButton
                            disabled
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="secondary"
                        >
                            Search Records
                        </CommonButton>
                        <CommonButton
                            disabled
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
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
                            startIcon={<SaveOutlinedIcon />}
                            variant="primary"
                        >
                            Saving
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<SearchOutlinedIcon />}
                            variant="secondary"
                        >
                            Searching
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<DeleteOutlineIcon />}
                            variant="outlined"
                        >
                            Removing
                        </CommonButton>
                        <CommonButton
                            size="medium"
                            startIcon={<CalendarMonthOutlinedIcon />}
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
            </Stack>
        </Box>
    );
}