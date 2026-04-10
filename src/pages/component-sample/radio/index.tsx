import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import { Box, Stack } from '@mui/system';

/**
 * CommonRadioSample
 *
 * A demonstration page that renders individual radio buttons and functional
 * radio groups, showcasing state handling and layout variations.
 */
export default function CommonRadioSample() {
    return (
        <div className="bg-[#FFFFFF] flex gap-10 h-full items-center justify-center p-5 w-full">
            {/* SECTION 1: Standalone Radio Buttons
                These are not wrapped in a RadioGroup, meaning they aren't
                automatically mutually exclusive unless managed by custom state.
            */}
            <Stack spacing={2}>
                <Box className="flex flex-wrap gap-2">
                    <Radio checked />
                    <Radio />
                    <Radio checked disabled />
                    <Radio disabled />
                </Box>
            </Stack>

            {/* SECTION 2: Vertical Radio Group
                Using FormControl provides context like labels.
                RadioGroup manages the 'name' and 'defaultValue' so only one
                option can be selected at a time.
            */}
            <FormControl>
                <FormLabel id="demo-radio-buttons-group-label">Vertical Radio Group</FormLabel>
                <RadioGroup
                    aria-labelledby="demo-radio-buttons-group-label"
                    defaultValue="option-1"
                    name="radio-buttons-group-vertical"
                >
                    {/* FormControlLabel links the Radio component with a text label */}
                    <FormControlLabel control={<Radio />} label="Default Checked" value="option-1" />
                    <FormControlLabel control={<Radio />} label="Unchecked" value="option-2" />
                    <FormControlLabel control={<Radio checked disabled />} label="Checked & Disabled" value="option-3" />
                    <FormControlLabel control={<Radio disabled />} label="Disabled" value="option-4" />
                </RadioGroup>
            </FormControl>

            {/* SECTION 3: Horizontal Radio Group
                The 'row' prop on RadioGroup switches the layout from vertical to horizontal.
            */}
            <FormControl>
                <FormLabel id="demo-row-radio-buttons-group-label">Horizontal Radio Group</FormLabel>
                <RadioGroup
                    aria-labelledby="demo-row-radio-buttons-group-label"
                    defaultValue="option-1"
                    name="radio-buttons-group-horizontal"
                    row
                    sx={{ gap: 5 }}
                >
                    <FormControlLabel control={<Radio />} label="Default Checked" value="option-1" />
                    <FormControlLabel control={<Radio />} label="Unchecked" value="option-2" />
                    <FormControlLabel control={<Radio checked disabled />} label="Checked & Disabled" value="option-3" />
                    <FormControlLabel control={<Radio disabled />} label="Disabled" value="option-4" />
                </RadioGroup>
            </FormControl>
        </div>
    );
}