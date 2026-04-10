import CommonInput from '@components/input/CommonInput';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { InputAdornment } from '@mui/material';
import InputDemoRow from '@pages/component-sample/input/InputDemoRow';
import InputPreviewCard from '@pages/component-sample/input/InputPreviewCard';
import InputSectionCard from '@pages/component-sample/input/InputSectionCard';

export default function InputAdornmentSamples() {
    return (
        <InputSectionCard
            subtitle="Adornment combinations using start and end icons with variant options."
            title="Adornment Variations"
        >
            <InputDemoRow label="Start icon / Outlined">
                <InputPreviewCard title="Outlined / Search">
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
                <InputPreviewCard title="Outlined / Email">
                    <CommonInput
                        placeholder="Email address"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AlternateEmailIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Start icon / Filled">
                <InputPreviewCard title="Filled / Search">
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
                <InputPreviewCard title="Filled / Email">
                    <CommonInput
                        placeholder="Email address"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AlternateEmailIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="filled"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="End icon / Outlined">
                <InputPreviewCard title="Outlined / Calendar">
                    <CommonInput
                        placeholder="Select date"
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
                <InputPreviewCard title="Outlined / Password">
                    <CommonInput
                        placeholder="Password"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VisibilityOffOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="End icon / Filled">
                <InputPreviewCard title="Filled / Calendar">
                    <CommonInput
                        placeholder="Select date"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <CalendarMonthOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard title="Filled / Password">
                    <CommonInput
                        placeholder="Password"
                        slotProps={{
                            input: {
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
            <InputDemoRow label="Start and end icon / Outlined">
                <InputPreviewCard title="Outlined / Search + action">
                    <CommonInput
                        placeholder="Search keyword"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
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
                <InputPreviewCard title="Outlined / Email + visibility">
                    <CommonInput
                        placeholder="Enter credential"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AlternateEmailIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <VisibilityOffOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Start and end icon / Filled">
                <InputPreviewCard title="Filled / Search + action">
                    <CommonInput
                        placeholder="Search keyword"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <CalendarMonthOutlinedIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard title="Filled / Email + visibility">
                    <CommonInput
                        placeholder="Enter credential"
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AlternateEmailIcon fontSize="small" />
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