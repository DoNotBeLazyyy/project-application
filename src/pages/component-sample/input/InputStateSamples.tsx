import CommonInput from '@components/input/CommonInput';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { InputAdornment } from '@mui/material';
import InputDemoRow from '@pages/component-sample/input/InputDemoRow';
import InputPreviewCard from '@pages/component-sample/input/InputPreviewCard';
import InputSectionCard from '@pages/component-sample/input/InputSectionCard';

export default function InputStateSamples() {
    return (
        <InputSectionCard
            label="State Reference"
            subtitle="Reference examples for different input states and variants."
        >
            <InputDemoRow label="Default / Outlined">
                <InputPreviewCard label="Outlined / Regular">
                    <CommonInput
                        placeholder="Enter username"
                        variant="outlined"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Outlined / With start icon">
                    <CommonInput
                        placeholder="Search users"
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
                <InputPreviewCard label="Outlined / With end icon">
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
            <InputDemoRow label="Default / Filled">
                <InputPreviewCard label="Filled / Regular">
                    <CommonInput
                        placeholder="Enter username"
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Filled / With start icon">
                    <CommonInput
                        placeholder="Search users"
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
                <InputPreviewCard label="Filled / With end icon">
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
            <InputDemoRow label="Disabled / Outlined">
                <InputPreviewCard label="Outlined / Disabled / regular">
                    <CommonInput disabled placeholder="Disabled input" variant="outlined" />
                </InputPreviewCard>

                <InputPreviewCard label="Outlined / Disabled / start icon">
                    <CommonInput
                        disabled
                        placeholder="Disabled search"
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
                <InputPreviewCard label="Outlined / Disabled / end icon">
                    <CommonInput
                        disabled
                        placeholder="Disabled password"
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
            <InputDemoRow label="Disabled / Filled">
                <InputPreviewCard label="Filled / Disabled / regular">
                    <CommonInput
                        disabled
                        placeholder="Disabled input"
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Filled / Disabled / start icon">
                    <CommonInput
                        disabled
                        placeholder="Disabled search"
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
                <InputPreviewCard label="Filled / Disabled / end icon">
                    <CommonInput
                        disabled
                        placeholder="Disabled password"
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
        </InputSectionCard>
    );
}