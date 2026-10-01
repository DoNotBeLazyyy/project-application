import CommonButton from '@components/button/CommonButton';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect, { CommonSelectOption } from '@components/select/CommonSelect';
import { GraduationCapIcon, IdentificationCardIcon } from '@phosphor-icons/react';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import { initAuthSession } from '@services/auth.service';
import { createMyStudentProfile } from '@services/profile.service';
import { getPrograms } from '@services/program/program.service';
import { useToastStore } from '@stores/toast.store';
import { MyProfile } from '@type/profile.type';
import { useEffect, useState } from 'react';

const YEAR_LEVEL_OPTIONS: CommonSelectOption[] = [
    { label: '1st Year', value: 1 },
    { label: '2nd Year', value: 2 },
    { label: '3rd Year', value: 3 },
    { label: '4th Year', value: 4 },
    { label: '5th Year', value: 5 },
    { label: '6th Year', value: 6 }
];

export interface StudentProfilePromptModalProps {
    open: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
    currentProfile?: MyProfile | null;
    isMandatory?: boolean;
}

export default function StudentProfilePromptModal({
    open,
    onClose,
    onSuccess,
    currentProfile,
    isMandatory = false
}: StudentProfilePromptModalProps) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [programOptions, setProgramOptions] = useState<CommonSelectOption[]>([]);
    const [selectedProgramId, setSelectedProgramId] = useState('');
    const [selectedYearLevel, setSelectedYearLevel] = useState<number>(1);
    const [mobileNumber, setMobileNumber] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [civilStatus, setCivilStatus] = useState('');
    const [nationality, setNationality] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);

    useEffect(function() {
        if (!open) return;

        if (currentProfile) {
            setFirstName(currentProfile.first_name || '');
            setLastName(currentProfile.last_name || '');
            setMobileNumber(currentProfile.mobile_number || '');
            setDateOfBirth(currentProfile.date_of_birth || '');
            setGender(currentProfile.gender || '');
            setCivilStatus(currentProfile.civil_status || '');
            setNationality(currentProfile.nationality || '');
        }

        async function fetchPrograms() {
            setIsLoadingPrograms(true);
            const result = await getPrograms();
            if (result.data) {
                setProgramOptions(
                    result.data.map(function(program) {
                        return {
                            label: `${program.code} · ${program.label}`,
                            value: program.id
                        };
                    })
                );
            }
            setIsLoadingPrograms(false);
        }

        fetchPrograms();
    }, [open, currentProfile]);

    async function handleSubmit() {
        if (!firstName.trim() || !lastName.trim()) {
            useToastStore.getState().showToast('First name and last name are required.', 'error');
            return;
        }

        setIsSubmitting(true);
        const result = await createMyStudentProfile({
            civil_status: civilStatus || undefined,
            date_of_birth: dateOfBirth || undefined,
            first_name: firstName.trim(),
            gender: gender || undefined,
            last_name: lastName.trim(),
            mobile_number: mobileNumber.trim() || undefined,
            nationality: nationality.trim() || undefined,
            program_id: selectedProgramId || undefined,
            year_level: selectedYearLevel
        });
        setIsSubmitting(false);

        if (!result.error) {
            const assignedNo = result.data?.student_number;
            const successMsg = assignedNo
                ? `Student profile set up successfully! System Generated Student No: ${assignedNo}`
                : 'Student profile set up successfully!';
            useToastStore.getState().showToast(successMsg, 'success');
            await initAuthSession();
            onSuccess?.();
            if (onClose) onClose();
        }
    }

    return (
        <CommonModal
            open={open}
            onClose={isMandatory ? undefined : onClose}
            cardProps={{
                cardHeaderProps: {
                    title: 'Complete Your Student Profile',
                    subheader: 'Please fill in your student information to activate your student account.'
                }
            }}
        >
            <div className="flex flex-col gap-5 p-4 pt-0">
                <div className="border border-(--mui-palette-info-main) bg-(--mui-palette-info-light) p-3 rounded-lg flex items-start gap-3 text-xs text-(--mui-palette-text-primary)">
                    <GraduationCapIcon size={24} className="text-(--mui-palette-info-main) shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold m-0 text-sm">Welcome Student!</p>
                        <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                            You currently do not have an active student profile. Please complete the form below to register your student details.
                        </p>
                    </div>
                </div>

                <div className="border border-(--mui-palette-divider) p-3 rounded-lg bg-(--mui-palette-background-default) flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <IdentificationCardIcon size={20} className="text-(--mui-palette-primary-main)" />
                        <span className="text-xs font-medium text-(--mui-palette-text-secondary)">Student Number:</span>
                    </div>
                    <span className="font-mono text-xs font-semibold px-2 py-1 bg-(--mui-palette-action-hover) rounded text-(--mui-palette-primary-main) border border-(--mui-palette-divider)">
                        System Generated
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CommonInput
                        disabled={isSubmitting}
                        fullWidth
                        label="First Name"
                        required
                        size="small"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />

                    <CommonInput
                        disabled={isSubmitting}
                        fullWidth
                        label="Last Name"
                        required
                        size="small"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />

                    <CommonSelect
                        disabled={isSubmitting || isLoadingPrograms}
                        fullWidth
                        label="Academic Program"
                        options={programOptions}
                        size="small"
                        value={selectedProgramId}
                        onChange={(e) => setSelectedProgramId(e.target.value as string)}
                    />

                    <CommonSelect
                        disabled={isSubmitting}
                        fullWidth
                        label="Year Level"
                        options={YEAR_LEVEL_OPTIONS}
                        size="small"
                        value={selectedYearLevel}
                        onChange={(e) => setSelectedYearLevel(Number(e.target.value))}
                    />

                    <CommonInput
                        disabled={isSubmitting}
                        fullWidth
                        label="Mobile Number (Optional)"
                        size="small"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                    />

                    <CommonInput
                        disabled={isSubmitting}
                        fullWidth
                        label="Date of Birth (Optional)"
                        size="small"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                    />

                    <CommonSelect
                        disabled={isSubmitting}
                        fullWidth
                        label="Gender (Optional)"
                        options={GENDER_OPTIONS}
                        size="small"
                        value={gender}
                        onChange={(e) => setGender(e.target.value as string)}
                    />

                    <CommonSelect
                        disabled={isSubmitting}
                        fullWidth
                        label="Civil Status (Optional)"
                        options={CIVIL_STATUS_OPTIONS}
                        size="small"
                        value={civilStatus}
                        onChange={(e) => setCivilStatus(e.target.value as string)}
                    />
                </div>

                <div className="flex gap-2 justify-end mt-2">
                    {!isMandatory && onClose && (
                        <CommonButton
                            color="inherit"
                            disabled={isSubmitting}
                            size="small"
                            variant="outlined"
                            onClick={onClose}
                        >
                            Cancel
                        </CommonButton>
                    )}
                    <CommonButton
                        disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
                        size="small"
                        variant="contained"
                        onClick={handleSubmit}
                    >
                        {isSubmitting ? 'Saving Profile...' : 'Save & Create Profile'}
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}
