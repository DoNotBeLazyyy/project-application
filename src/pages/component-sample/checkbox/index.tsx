import {
    Box, Checkbox, FormControlLabel, FormGroup, FormLabel, Stack
} from '@mui/material';
import { ChangeEventInput } from '@type/common.type';
import { useState } from 'react';

/**
 * CommonCheckboxSample
 * A component demonstrating independent state management for checkboxes
 * and a parent-child relationship using functional declarations.
 */
export default function CommonCheckboxSample() {
    const [childOne, setChildOne] = useState(true); // State hook for the first checkbox child
    const [childTwo, setChildTwo] = useState(false); // State hook for the second checkbox child

    /**
     * Synchronizes all child checkboxes with the parent's state.
     * When the parent is toggled, it forces both childOne and childTwo
     * to match the parent's new boolean value.
     *
     * @param event - The change event from the parent checkbox.
     */
    function handleParentChange(event: ChangeEventInput) {
        const newValue = event.target.checked;

        setChildOne(newValue);
        setChildTwo(newValue);
    }

    /**
     * Toggles the state of the first child checkbox only.
     * This updates the childOne variable based on user interaction.
     *
     *  @param event - The change event from the first child checkbox.
     */
    function handleChildOneChange(event: ChangeEventInput) {
        setChildOne(event.target.checked);
    }

    /**
     * Toggles the state of the first child checkbox only.
     * This updates the childOne variable based on user interaction.
     *
     *  @param event - The change event from the second child checkbox.
     */
    function handleChildTwoChange(event: ChangeEventInput) {
        setChildTwo(event.target.checked);
    }

    return (
        <div className="bg-white flex flex-col gap-10 items-center justify-center md:flex-row min-h-screen p-10 w-full">
            <Stack spacing={2}>
                <Box className="flex flex-wrap gap-2">
                    <Checkbox defaultChecked />
                    <Checkbox />
                    <Checkbox
                        checked
                        disabled
                    />
                    <Checkbox disabled />
                    <Checkbox indeterminate />
                </Box>
            </Stack>
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
                        control={
                            <Checkbox
                                checked
                                disabled
                            />
                        }
                        label="Checked & Disabled"
                    />
                </FormGroup>
            </Stack>
            <Stack spacing={2}>
                <FormLabel>Checkbox Hierarchy Group</FormLabel>
                <FormGroup>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={childOne && childTwo}
                                indeterminate={childOne !== childTwo}
                                onChange={handleParentChange}
                            />
                        }
                        label="Parent Selection"
                    />
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            ml: 4
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={childOne}
                                    onChange={handleChildOneChange}
                                />
                            }
                            label="Child Option 1"
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={childTwo}
                                    onChange={handleChildTwoChange}
                                />
                            }
                            label="Child Option 2"
                        />
                    </Box>
                </FormGroup>
            </Stack>
        </div>
    );
}