import CommonButton from '@components/button/CommonButton';
import CommonProgressBar from '@components/progress-bar/CommonProgressBar';
import CommonStatusBadge from '@components/status-badge/CommonStatusBadge';
import CommonStepper from '@components/stepper/CommonStepper';
import { StepConfig } from '@type/stepper.type';
import { Slider, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';

// Payroll workflow step definitions
const PAYROLL_STEPS: StepConfig[] = [
    { title: 'Setup', statusBadge: { label: 'Pending', variant: 'success' } },
    { title: 'Attendance', statusBadge: { label: '2 Issues', variant: 'warning' } },
    { title: 'Adjustments', statusBadge: { label: 'Cancelled', variant: 'error' } },
    { title: 'Preview', statusBadge: { label: 'Pending', variant: 'info' } },
    { title: 'Generate Payroll', statusBadge: { label: 'Pending', variant: 'info' } }
]; // 5-step payroll sample data

// Employee onboarding step definitions
const EMPLOYEE_STEPS: StepConfig[] = [
    { title: 'Assignment' },
    { title: 'Personal Details' },
    { title: 'Shift Schedule' },
    { title: 'Salary, Earnings, and Deductions' },
    { title: 'Bank Accounts' },
    { title: 'Preview & Save' }
]; // 6-step employee sample data

/**
 * CommonStepperSample
 *
 * Demonstrates the CommonStepper component in horizontal, vertical,
 * tall-container, and dynamic-progress layouts.
 *
 * @example
 * <CommonStepperSample />
 */
export default function CommonStepperSample() {
    const [horizontalStep, setHorizontalStep] = useState(2); // Active horizontal step
    const [verticalStep, setVerticalStep] = useState(2); // Active vertical step
    const [tallStep, setTallStep] = useState(0); // Active tall-container step
    const [barPercentage, setBarPercentage] = useState(67); // Progress bar demo percentage
    const [dynamicStep, setDynamicStep] = useState(1); // Active dynamic-progress step
    const [dynamicProgress, setDynamicProgress] = useState(35); // Current step form progress
    const [navStep, setNavStep] = useState(0); // Active step for navigation demo
    const [navCompleted, setNavCompleted] = useState(3); // Highest completed step for navigation demo

    const dynamicSteps = useMemo(() => [
        { title: 'Personal Info', progress: 100 },
        { title: 'Employment', progress: dynamicProgress, statusBadge: { label: `${dynamicProgress}%`, variant: 'info' as const } },
        { title: 'Documents' },
        { title: 'Confirmation' }
    ], [dynamicProgress]); // Steps with dynamic progress on the active step

    /**
     * Handles progress slider change.
     *
     * @param _ - The synthetic event (unused).
     * @param value - The new slider value.
     */
    function handleProgressChange(_: Event, value: number | number[]) {
        setDynamicProgress(value as number);
    }

    return (
        <div className="flex flex-col gap-10 h-full overflow-y-auto p-10 w-full">
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Status Badge
                </Typography>
                <Stack
                    direction="row"
                    spacing={2}
                >
                    <CommonStatusBadge
                        label="Pending"
                        variant="info"
                    />
                    <CommonStatusBadge
                        label="Completed"
                        variant="success"
                    />
                    <CommonStatusBadge
                        label="2 Issues"
                        variant="warning"
                    />
                    <CommonStatusBadge
                        label="Cancelled"
                        variant="error"
                    />
                </Stack>
            </Stack>
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Progress Bar
                </Typography>
                <div className="bg-(--mui-tokens-color-common-white) flex flex-col gap-8 p-6 rounded-(--mui-tokens-radius-lg) w-[400px]">
                    <CommonProgressBar
                        label="Upload Progress"
                        percentage={barPercentage}
                        subText={`${barPercentage}% complete`}
                    />
                    <CommonProgressBar
                        percentage={barPercentage}
                        type="percentOnly"
                    />
                    <CommonProgressBar
                        height={4}
                        percentage={barPercentage}
                        type="bar"
                    />
                </div>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {[0, 25, 50, 75, 100].map((pct) => {
                        /**
                         * Handles percentage button click.
                         */
                        function handleClick() {
                            setBarPercentage(pct);
                        }

                        return (
                            <CommonButton
                                key={pct}
                                variant="contained"
                                onClick={handleClick}
                            >
                                {pct}%
                            </CommonButton>
                        );
                    })}
                </Stack>
            </Stack>
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Horizontal Stepper
                </Typography>
                <Typography
                    sx={{
                        color: 'var(--mui-tokens-color-neutral-500)',
                        fontSize: '14px'
                    }}
                >
                    Active Step: {horizontalStep + 1} — Click a completed step to navigate back.
                </Typography>

                <div className="bg-(--mui-tokens-color-common-white) p-6 rounded-(--mui-tokens-radius-lg)">
                    <CommonStepper
                        activeStep={horizontalStep}
                        steps={PAYROLL_STEPS}
                        onStepClick={setHorizontalStep}
                    />
                </div>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {PAYROLL_STEPS.map(({ title }, index) => {
                        /**
                         * Handles step button click.
                         */
                        function handleClick() {
                            setHorizontalStep(index);
                        }

                        return (
                            <CommonButton
                                key={title}
                                variant="contained"
                                onClick={handleClick}
                            >
                                {title}
                            </CommonButton>
                        );
                    })}
                    <CommonButton
                        variant="secondary"
                        onClick={() => setHorizontalStep(PAYROLL_STEPS.length)}
                    >
                        All Complete
                    </CommonButton>
                </Stack>
            </Stack>
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Dynamic Progress Stepper
                </Typography>
                <Typography
                    sx={{
                        color: 'var(--mui-tokens-color-neutral-500)',
                        fontSize: '14px'
                    }}
                >
                    Step 2 is active. Drag the slider to simulate form completion — the connector bar fills accordingly.
                </Typography>
                <div className="flex gap-6 items-start">
                    <div className="bg-(--mui-tokens-color-common-white) flex-1 p-6 rounded-(--mui-tokens-radius-lg)">
                        <CommonStepper
                            activeStep={dynamicStep}
                            steps={dynamicSteps}
                            onStepClick={setDynamicStep}
                        />
                    </div>
                    <div className="bg-(--mui-tokens-color-common-white) inline-flex p-6 rounded-(--mui-tokens-radius-lg)">
                        <CommonStepper
                            activeStep={dynamicStep}
                            orientation="vertical"
                            steps={dynamicSteps}
                            onStepClick={setDynamicStep}
                        />
                    </div>
                </div>
                <div className="flex flex-col gap-2 w-[300px]">
                    <Typography
                        sx={{
                            color: 'var(--mui-tokens-color-neutral-700)',
                            fontSize: '14px',
                            fontWeight: 700
                        }}
                    >
                        Form Progress: {dynamicProgress}%
                    </Typography>
                    <Slider
                        max={100}
                        min={0}
                        value={dynamicProgress}
                        onChange={handleProgressChange}
                    />
                </div>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {dynamicSteps.map(({ title }, index) => {
                        /**
                         * Handles step button click.
                         */
                        function handleClick() {
                            setDynamicStep(index);
                        }

                        return (
                            <CommonButton
                                key={title}
                                variant="contained"
                                onClick={handleClick}
                            >
                                {title}
                            </CommonButton>
                        );
                    })}
                    <CommonButton
                        variant="secondary"
                        onClick={() => setDynamicStep(dynamicSteps.length)}
                    >
                        All Complete
                    </CommonButton>
                </Stack>
            </Stack>
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Navigation (completedUpTo)
                </Typography>
                <Typography
                    sx={{
                        color: 'var(--mui-tokens-color-neutral-500)',
                        fontSize: '14px'
                    }}
                >
                    Active: Step {navStep + 1}, Completed up to: Step {navCompleted}. Navigate back without losing completion.
                </Typography>
                <div className="bg-(--mui-tokens-color-common-white) p-6 rounded-(--mui-tokens-radius-lg)">
                    <CommonStepper
                        activeStep={navStep}
                        completedUpTo={navCompleted}
                        steps={EMPLOYEE_STEPS}
                        onStepClick={setNavStep}
                    />
                </div>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {EMPLOYEE_STEPS.map(({ title }, index) => {
                        /**
                         * Handles nav step click.
                         */
                        function handleClick() {
                            setNavStep(index);
                        }

                        return (
                            <CommonButton
                                key={title}
                                variant="contained"
                                onClick={handleClick}
                            >
                                {title}
                            </CommonButton>
                        );
                    })}
                </Stack>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {[0, 1, 2, 3, 4, 5, 6].map((step) => {
                        /**
                         * Handles completedUpTo click.
                         */
                        function handleClick() {
                            setNavCompleted(step);
                        }

                        const buttonLabel = step === 6
                            ? 'All'
                            : `Up to ${step + 1}`; // Resolved label

                        return (
                            <CommonButton
                                key={step}
                                variant="secondary"
                                onClick={handleClick}
                            >
                                {buttonLabel}
                            </CommonButton>
                        );
                    })}
                </Stack>
            </Stack>
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Vertical Stepper
                </Typography>
                <Typography
                    sx={{
                        color: 'var(--mui-tokens-color-neutral-500)',
                        fontSize: '14px'
                    }}
                >
                    Active Step: {verticalStep + 1} — Click a completed step to navigate back.
                </Typography>
                <div className="bg-(--mui-tokens-color-common-white) inline-flex p-6 rounded-(--mui-tokens-radius-lg)">
                    <CommonStepper
                        activeStep={verticalStep}
                        orientation="vertical"
                        steps={PAYROLL_STEPS}
                        onStepClick={setVerticalStep}
                    />
                </div>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {PAYROLL_STEPS.map(({ title }, index) => {
                        /**
                         * Handles step button click.
                         */
                        function handleClick() {
                            setVerticalStep(index);
                        }

                        return (
                            <CommonButton
                                key={title}
                                variant="contained"
                                onClick={handleClick}
                            >
                                {title}
                            </CommonButton>
                        );
                    })}
                </Stack>
            </Stack>
            <Stack spacing={4}>
                <Typography
                    sx={{
                        color: 'var(--mui-palette-primary-main)',
                        fontSize: '24px',
                        fontWeight: 700
                    }}
                >
                    Vertical Stepper — Tall Container (stretches to fill)
                </Typography>
                <Typography
                    sx={{
                        color: 'var(--mui-tokens-color-neutral-500)',
                        fontSize: '14px'
                    }}
                >
                    The stepper fills the 800px container. Lines stretch to distribute steps evenly.
                </Typography>
                <div className="bg-(--mui-tokens-color-common-white) flex h-[800px] p-6 rounded-(--mui-tokens-radius-lg) w-[320px]">
                    <CommonStepper
                        activeStep={tallStep}
                        className="h-full"
                        orientation="vertical"
                        steps={EMPLOYEE_STEPS}
                        onStepClick={setTallStep}
                    />
                </div>
                <Stack
                    direction="row"
                    spacing={1}
                >
                    {EMPLOYEE_STEPS.map(({ title }, index) => {
                        /**
                         * Handles step button click.
                         */
                        function handleClick() {
                            setTallStep(index);
                        }

                        return (
                            <CommonButton
                                key={title}
                                variant="contained"
                                onClick={handleClick}
                            >
                                {title}
                            </CommonButton>
                        );
                    })}
                    <CommonButton
                        variant="secondary"
                        onClick={() => setTallStep(EMPLOYEE_STEPS.length)}
                    >
                        All Complete
                    </CommonButton>
                </Stack>
            </Stack>
        </div>
    );
}