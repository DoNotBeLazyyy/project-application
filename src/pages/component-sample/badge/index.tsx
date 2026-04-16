import { CommonBadgeState } from '@components/badge/CommonBadgeState';
import { CommonBadgeStatus } from '@components/badge/CommonBadgeStatus';
import { CommonChip } from '@components/badge/CommonChip';
import { Chip } from '@mui/material';
import { Stack } from '@mui/system';
import { ClockIcon } from '@phosphor-icons/react';

export default function CommonBadgeSample() {

    return (
        <div className="flex flex-col gap-(--mui-tokens-spacing-9) h-full items-center justify-center p-(--mui-tokens-spacing-6) w-full">
            <Stack direction="row" spacing={10}>
                <div className="flex flex-col gap-(--mui-tokens-spacing-3) justify-center text-center">
                    STATUS BADGE
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <CommonBadgeStatus label={'Info'} size={'small'} variant={'info'} />
                        <CommonBadgeStatus label={'Info'} size={'medium'} variant={'info'} />
                        <CommonBadgeStatus label={'Info'} size={'large'} variant={'info'} />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <CommonBadgeStatus label={'Success'} size={'small'} variant={'success'} />
                        <CommonBadgeStatus label={'Success'} size={'medium'} variant={'success'} />
                        <CommonBadgeStatus label={'Success'} size={'large'} variant={'success'} />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <CommonBadgeStatus label={'Warning'} size={'small'} variant={'warning'} />
                        <CommonBadgeStatus label={'Warning'} size={'medium'} variant={'warning'} />
                        <CommonBadgeStatus label={'Warning'} size={'large'} variant={'warning'} />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <CommonBadgeStatus label={'Error'} size={'small'} variant={'error'} />
                        <CommonBadgeStatus label={'Error'} size={'medium'} variant={'error'} />
                        <CommonBadgeStatus label={'Error'} size={'large'} variant={'error'} />
                    </div>
                </div>
                <div className="flex flex-col gap-(--mui-tokens-spacing-3) justify-center text-center">
                    <div className="flex flex-col gap-(--mui-tokens-spacing-3) justify-center text-center">
                        STATE BADGE
                        <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                            <CommonBadgeState label={'Active'} size={'small'} variant={'active'} />
                            <CommonBadgeState label={'Active'} size={'medium'} variant={'active'} />
                            <CommonBadgeState label={'Active'} size={'large'} variant={'active'} />
                        </div>
                        <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                            <CommonBadgeState label={'Inactive'} size={'small'} variant={'inactive'} />
                            <CommonBadgeState label={'Inactive'} size={'medium'} variant={'inactive'} />
                            <CommonBadgeState label={'Inactive'} size={'large'} variant={'inactive'} />
                        </div>
                        <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                            <CommonBadgeState label={'Present'} size={'small'} variant={'active'} />
                            <CommonBadgeState label={'Present'} size={'medium'} variant={'active'} />
                            <CommonBadgeState label={'Present'} size={'large'} variant={'active'} />
                        </div>
                        <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                            <CommonBadgeState label={'Absent'} size={'small'} variant={'inactive'} />
                            <CommonBadgeState label={'Absent'} size={'medium'} variant={'inactive'} />
                            <CommonBadgeState label={'Absent'} size={'large'} variant={'inactive'} />
                        </div>
                    </div>
                </div>
            </Stack>
            <Stack direction="row" spacing={10}>
                <div className="flex flex-col gap-(--mui-tokens-spacing-3) justify-center text-center">
                    COMMON CHIP
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        LIGHT
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'small'}
                            variant={'light'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'medium'}
                            variant={'light'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'large'}
                            variant={'light'}
                        />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        DARK
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'small'}
                            variant={'dark'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'medium'}
                            variant={'dark'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'large'}
                            variant={'dark'}
                        />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        GHOST
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'small'}
                            variant={'ghost'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'medium'}
                            variant={'ghost'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'large'}
                            variant={'ghost'}
                        />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        OUTLINE
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'small'}
                            variant={'outline'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'medium'}
                            variant={'outline'}
                        />
                        <CommonChip
                            icon={
                                <ClockIcon
                                    weight="bold"
                                />
                            }
                            label={'Chip Text'}
                            size={'large'}
                            variant={'outline'}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-(--mui-tokens-spacing-3) justify-center items-start">
                    GROUP BADGE
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <Chip color="light" label="Badge" size="small" />
                        <Chip color="light" label="Badge" size="small" />
                        <Chip label="+7" size="small" />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <Chip color="light" label="Badge" size="medium" />
                        <Chip color="light" label="Badge" size="medium" />
                        <Chip label="+7" size="medium" />
                    </div>
                    <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                        <Chip color="light" label="Badge" size="large" />
                        <Chip color="light" label="Badge" size="large" />
                        <Chip color="light" label="Badge" size="large" />
                        <Chip label="+7" size="large" />
                        <Chip label="+7" size="large" />
                    </div>
                    <div className="flex flex-col gap-(--mui-tokens-spacing-3) justify-center items-start">
                        You can replace custom colors with the sx prop.
                        <div className="flex gap-(--mui-tokens-spacing-3) justify-center">
                            <Chip
                                label="Active"
                                sx={{
                                    backgroundColor: '#FF0000',
                                    color: '#FFFFFF',
                                    border: '1px solid #1E40AF'
                                }}
                            />
                            <Chip
                                label="Active"
                                sx={{
                                    backgroundColor: '#BE3122',
                                    color: '#FFFFFF',
                                    border: '1px solid #1E40AF'
                                }}
                            />
                            <Chip
                                label="Active"
                                sx={{
                                    backgroundColor: '#12D122',
                                    color: '#FFFFFF',
                                    border: '1px solid #1E40AF'
                                }}
                            />
                            <Chip
                                label="Active"
                                sx={{
                                    backgroundColor: '#00FFFF',
                                    color: '#FFFFFF',
                                    border: '1px solid #1E40AF'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </Stack>
        </div>
    );
}