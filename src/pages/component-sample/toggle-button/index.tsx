import { Switch } from '@mui/material';
import { Stack } from '@mui/system';
import { InputChangeEvent } from '@type/common.type';
import { useState } from 'react';

export default function CommonToggleSample() {
    const [checked, setChecked] = useState(false); //

    /**
     *
     */
    function handleToggleChange(
        _event: InputChangeEvent,
        value: boolean
    ) {
        setChecked(value);
    }

    return (
        <div className="flex gap-[var(--mui-tokens-spacing-9)] h-full items-center justify-center p-[var(--mui-tokens-spacing-6)] w-full">
            <Stack spacing={10}>
                <div className="flex flex-col gap-[var(--mui-tokens-spacing-2)] justify-center text-[3.125rem]">
                    <div className="flex flex-col gap-[var(--mui-tokens-spacing-3)] p-[var(--mui-tokens-spacing-9)] text-[1.875rem]">
                        Switches with label
                        <div className="align-middle flex gap-[var(--mui-tokens-spacing-5)] leading-[20px] text-[var(--mui-tokens-color-neutral-600])">
                            <Switch
                                checked={true}
                            />
                            <div className="align-middle font-normal leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600]) text-base tracking-normal">
                            Toggle Button
                            </div>
                        </div>
                        <div className="align-middle flex gap-[var(--mui-tokens-spacing-5)] leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600])">
                            <Switch />
                            <div className="align-middle font-normal leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600]) text-base tracking-normal">
                            Toggle Button
                            </div>
                        </div>
                        <div className="align-middle flex gap-[var(--mui-tokens-spacing-5)] leading-[20px] text-[var(--mui-tokens-color-neutral-600])">
                            <Switch
                                checked={true}
                                disabled
                            />
                            <div className="align-middle font-normal leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600]) text-base tracking-normal">
                            Toggle Button
                            </div>
                        </div>
                        <div className="align-middle flex gap-[var(--mui-tokens-spacing-5)] leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600])">
                            <Switch
                                disabled
                            />
                            <div className="align-middle font-normal leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600]) text-base tracking-normal">
                            Toggle Button
                            </div>
                        </div>
                        <div className="align-middle flex gap-[var(--mui-tokens-spacing-5)] leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600])">
                            <Switch
                                checked={true}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked .MuiSwitch-thumb': {
                                        backgroundColor: '#ABFA00'
                                    },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                                        backgroundColor: '#FF0000'
                                    }
                                }}
                            />
                            <div className="align-middle font-normal leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600]) text-base tracking-normal">
                                Toggle Button with different color
                            </div>
                        </div>
                        <div className="align-middle flex gap-[var(--mui-tokens-spacing-5)] leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600])">
                            <Switch
                                onChange={handleToggleChange}
                            />
                            <div className="align-middle font-normal leading-[var(--mui-tokens-spacing-6)] text-[var(--mui-tokens-color-neutral-600]) text-base tracking-normal">
                                Toggle Button with checked state
                            </div>
                        </div>
                        {checked && (
                            <div className="flex text-[3.125rem]">
                                    HELLO WORLD
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-[var(--mui-tokens-spacing-3)] p-[var(--mui-tokens-spacing-9)] text-[1.875rem]">
                        Switches without label
                        <Switch checked={true} />
                        <Switch />
                        <Switch
                            checked={true}
                            disabled
                        />
                        <Switch
                            checked={false}
                            disabled
                        />
                    </div>
                </div>
            </Stack>
        </div>
    );
}