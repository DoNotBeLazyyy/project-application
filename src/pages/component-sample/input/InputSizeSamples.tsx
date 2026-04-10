import CommonInput from '@components/input/CommonInput';
import SearchIcon from '@mui/icons-material/Search';
import { InputAdornment } from '@mui/material';
import InputDemoRow from '@pages/component-sample/input/InputDemoRow';
import InputPreviewCard from '@pages/component-sample/input/InputPreviewCard';
import InputSectionCard from '@pages/component-sample/input/InputSectionCard';

export default function InputSizeSamples() {
    return (
        <InputSectionCard
            label="Size Scale"
            subtitle="Displays all supported CommonInput sizes with variant options."
        >
            <InputDemoRow label="Large / Outlined variant">
                <InputPreviewCard label="Large / Outlined / default">
                    <CommonInput
                        placeholder="Large outlined input"
                        size="large"
                        variant="outlined"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Large / Outlined / with start icon">
                    <CommonInput
                        placeholder="Search"
                        size="large"
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
                <InputPreviewCard label="Large / Outlined / with end icon">
                    <CommonInput
                        placeholder="Search"
                        size="large"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Large / Filled variant">
                <InputPreviewCard label="Large / Filled / default">
                    <CommonInput
                        placeholder="Large filled input"
                        size="large"
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Large / Filled / with start icon">
                    <CommonInput
                        placeholder="Search"
                        size="large"
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
                <InputPreviewCard label="Large / Filled / with end icon">
                    <CommonInput
                        placeholder="Search"
                        size="large"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="filled"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Small / Outlined variant">
                <InputPreviewCard label="Small / Outlined / default">
                    <CommonInput
                        placeholder="Small outlined input"
                        size="small"
                        variant="outlined"
                    />
                </InputPreviewCard>

                <InputPreviewCard label="Small / Outlined / with start icon">
                    <CommonInput
                        placeholder="Search"
                        size="small"
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
                <InputPreviewCard label="Small / Outlined / with end icon">
                    <CommonInput
                        placeholder="Search"
                        size="small"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }
                        }}
                        variant="outlined"
                    />
                </InputPreviewCard>
            </InputDemoRow>
            <InputDemoRow label="Small / Filled variant">
                <InputPreviewCard label="Small / Filled / default">
                    <CommonInput
                        placeholder="Small filled input"
                        size="small"
                        variant="filled"
                    />
                </InputPreviewCard>
                <InputPreviewCard label="Small / Filled / with start icon">
                    <CommonInput
                        placeholder="Search"
                        size="small"
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
                <InputPreviewCard label="Small / Filled / with end icon">
                    <CommonInput
                        placeholder="Search"
                        size="small"
                        slotProps={{
                            input: {
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <SearchIcon fontSize="small" />
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