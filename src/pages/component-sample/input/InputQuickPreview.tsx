import CommonInput from '@components/input/CommonInput';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { InputAdornment } from '@mui/material';
import InputDemoRow from '@pages/component-sample/input/InputDemoRow';
import InputPreviewCard from '@pages/component-sample/input/InputPreviewCard';
import InputSectionCard from '@pages/component-sample/input/InputSectionCard';

export default function InputQuickPreview() {
    return (
        <InputSectionCard
            label="Quick Preview"
            subtitle="Common input examples for quick visual checking."
        >
            <InputDemoRow label="Outlined variant">
                <InputPreviewCard label="Outlined / Default">
                    <CommonInput placeholder="Enter full name" variant="outlined" />
                </InputPreviewCard>
                <InputPreviewCard label="Outlined / Disabled">
                    <CommonInput disabled placeholder="Disabled input" variant="outlined" />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Filled variant">
                <InputPreviewCard label="Filled / Default">
                    <CommonInput placeholder="Search records" variant="filled" />
                </InputPreviewCard>
                <InputPreviewCard label="Filled / Disabled">
                    <CommonInput disabled placeholder="Disabled input" variant="filled" />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Outlined with adornments">
                <InputPreviewCard label="Outlined / Start icon">
                    <CommonInput
                        placeholder="Search"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Outlined / End icon">
                    <CommonInput
                        placeholder="Pick date"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <CalendarMonthOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Filled with adornments">
                <InputPreviewCard label="Filled / Start icon">
                    <CommonInput
                        placeholder="Search"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Filled / Start and end">
                    <CommonInput
                        placeholder="Password"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VisibilityOffOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="filled"
                    />
                </InputPreviewCard>
            </InputDemoRow>
        </InputSectionCard>
    );
}