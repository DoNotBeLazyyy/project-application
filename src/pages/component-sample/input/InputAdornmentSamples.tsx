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
            label="Adornment Variations"
            subtitle="Adornment combinations using start and end icons with variant options."
        >
            <InputDemoRow label="Start icon / Outlined">
                <InputPreviewCard label="Outlined / Search">
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
                <InputPreviewCard label="Outlined / Email">
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
                <InputPreviewCard label="Filled / Search">
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
                <InputPreviewCard label="Filled / Email">
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
                <InputPreviewCard label="Outlined / Calendar">
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
                <InputPreviewCard label="Outlined / Password">
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
                <InputPreviewCard label="Filled / Calendar">
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
                <InputPreviewCard label="Filled / Password">
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
                <InputPreviewCard label="Outlined / Search + action">
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
                <InputPreviewCard label="Outlined / Email + visibility">
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
                <InputPreviewCard label="Filled / Search + action">
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
                <InputPreviewCard label="Filled / Email + visibility">
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