import {
    Box, Checkbox, FormControlLabel, FormGroup, FormLabel, Stack
} from '@mui/material';
import { useState } from 'react';

/**
 * CommonCheckboxSample
 * * A demonstration page that renders individual checkbox buttons and functional
 * checkbox groups, showcasing state handling and layout variations.
 */
export default function CommonCheckboxSample() {
    // State to track the 'checked' status of the two child checkboxes
    // checked[0] is Child 1, checked[1] is Child 2
    const [checked, setChecked] = useState([true, false]);

    /**
     * Logic for the "Parent" checkbox.
     * When toggled, it forces both children to match its new state.
     */
    function handleParentChange(event: React.ChangeEvent<HTMLInputElement>) {
        setChecked([event.target.checked, event.target.checked]);
    }

    /**
     * Updates only the first child while preserving the state of the second.
     */
    function handleChild1Change(event: React.ChangeEvent<HTMLInputElement>) {
        setChecked([event.target.checked, checked[1]]);
    }

    /**
     * Updates only the second child while preserving the state of the first.
     */
    function handleChild2Change(event: React.ChangeEvent<HTMLInputElement>) {
        setChecked([checked[0], event.target.checked]);
    }

    return (
        <div className="bg-[#FFFFFF] flex flex-col gap-10 items-center justify-center md:flex-row min-h-screen p-10 w-full">

            {/* SECTION 1: Raw Checkboxes
                Shows different visual states without labels or complex logic.
            */}
            <Stack spacing={2}>
                <Box className="flex flex-wrap gap-2">
                    <Checkbox defaultChecked />
                    <Checkbox />
                    <Checkbox checked disabled />
                    <Checkbox disabled />
                    <Checkbox indeterminate />
                    <Checkbox disabled indeterminate/>
                </Box>
            </Stack>

            {/* SECTION 2: Vertical Group with Labels
                Demonstrates how to use FormGroup and FormControlLabel
                to associate text with checkboxes properly.
            */}
            <Stack spacing={2}>
                <FormGroup sx={{ gap: 1 }}>
                    <FormLabel>Vertical Checkbox Group</FormLabel>
                    <FormControlLabel
                        control={<Checkbox defaultChecked />}
                        label="Default Checked"
                    />

                    <FormControlLabel
                        control={<Checkbox />}
                        label="Unchecked"
                    />

                    <FormControlLabel
                        control={<Checkbox checked disabled />}
                        label="Checked & Disabled"
                    />

                    <FormControlLabel
                        control={<Checkbox disabled />}
                        label="Disabled"
                    />

                    <FormControlLabel
                        control={<Checkbox indeterminate />}
                        label="Indeterminate"
                    />

                    <FormControlLabel
                        control={<Checkbox disabled indeterminate />}
                        label="Disabled Indeterminate"
                    />
                </FormGroup>
            </Stack>

            {/* SECTION 3: Indeterminate Hierarchy
                A "Select All" pattern where the parent checkbox reflects
                the state of its children (Checked, Unchecked, or Partial/Indeterminate).
            */}
            <Stack spacing={2}>
                <FormLabel>Checkbox Hierarchy Group</FormLabel>
                <FormGroup>
                    <FormControlLabel
                        control={
                            <Checkbox
                                // Parent is 'checked' only if BOTH children are true
                                checked={checked[0] && checked[1]}
                                // Parent is 'indeterminate' (dash icon) if children states differ
                                indeterminate={checked[0] !== checked[1]}
                                onChange={handleParentChange}
                            />
                        }
                        label="Parent Selection"
                    />
                    {/* Indented container for child options */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', ml: 4 }}>
                        <FormControlLabel
                            control={<Checkbox checked={checked[0]} onChange={handleChild1Change} />}
                            label="Child Option 1"
                        />
                        <FormControlLabel
                            control={<Checkbox checked={checked[1]} onChange={handleChild2Change} />}
                            label="Child Option 2"
                        />
                    </Box>
                </FormGroup>
            </Stack>
        </div>
    );
}