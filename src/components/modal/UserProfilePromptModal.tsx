import CommonButton from '@components/button/CommonButton';
import { CommonDatePicker } from '@components/datepicker/ValidCommonDatepicker';
import CommonInput from '@components/input/CommonInput';
import CommonModal from '@components/modal/CommonModal';
import CommonSelect from '@components/select/CommonSelect';
import { CIVIL_STATUS_OPTIONS, GENDER_OPTIONS } from '@pages/shared/profile/constants/profile.constant';
import { BuildingsIcon, GraduationCapIcon, SignOutIcon, UserCircleIcon } from '@phosphor-icons/react';
import { initAuthSession, logout } from '@services/auth.service';
import { completeUserProfile } from '@services/profile.service';
import { useAppStore } from '@stores/app.store';
import { useToastStore } from '@stores/toast.store';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface UserProfilePromptModalProps {
    open: boolean;
    onClose?: () => void;
    onSuccess?: () => void;
    isMandatory?: boolean;
}

export default function UserProfilePromptModal({
    open,
    onClose,
    onSuccess,
    isMandatory = true
}: UserProfilePromptModalProps) {
    const navigate = useNavigate();
    const userProfile = useAppStore((state) => state.userProfile);
    const activeRole = useAppStore((state) => state.activeRole);
    const availableRoles = useAppStore((state) => state.availableRoles);

    const isDean = activeRole === 'Dean' || availableRoles.some((r) => r.code === 'Dean');
    const isStudent = activeRole === 'Student' || availableRoles.some((r) => r.code === 'Student');

    // Personal fields
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [suffix, setSuffix] = useState('');
    const [preferredName, setPreferredName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [gender, setGender] = useState('');
    const [civilStatus, setCivilStatus] = useState('');
    const [nationality, setNationality] = useState('');

    // Address fields
    const [addressLine1, setAddressLine1] = useState('');
    const [addressLine2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [postalCode, setPostalCode] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!open) return;

        if (userProfile) {
            setFirstName(userProfile.first_name || '');
            setMiddleName(userProfile.middle_name || '');
            setLastName(userProfile.last_name || '');
            setSuffix(userProfile.suffix || '');
            setPreferredName(userProfile.preferred_name || '');
            setMobileNumber(userProfile.mobile_number || '');
        }
    }, [open, userProfile]);

    async function handleLogout() {
        await logout();
        navigate('/login');
    }

    async function handleSubmit() {
        if (!firstName.trim()) {
            useToastStore.getState().showToast('First name is required.', 'error');
            return;
        }

        if (!lastName.trim()) {
            useToastStore.getState().showToast('Last name is required.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await completeUserProfile({
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                middle_name: middleName.trim() || undefined,
                suffix: suffix.trim() || undefined,
                preferred_name: preferredName.trim() || undefined,
                mobile_number: mobileNumber.trim() || undefined,
                date_of_birth: dateOfBirth || undefined,
                gender: gender || undefined,
                civil_status: civilStatus || undefined,
                nationality: nationality.trim() || undefined,
                address_line1: addressLine1.trim() || undefined,
                address_line2: addressLine2.trim() || undefined,
                city: city.trim() || undefined,
                province: province.trim() || undefined,
                postal_code: postalCode.trim() || undefined
            });

            if (res.error) {
                useToastStore.getState().showToast(res.error.message || 'Failed to complete profile.', 'error');
                return;
            }

            useToastStore.getState().showToast('Profile completed successfully! Welcome aboard.', 'success');
            await initAuthSession();
            onSuccess?.();
            onClose?.();
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <CommonModal
            fullWidth
            maxWidth="md"
            open={open}
            onClose={isMandatory ? undefined : onClose}
            cardProps={{
                className: 'flex flex-col max-h-[100dvh] sm:max-h-[85dvh] w-full max-w-2xl overflow-hidden',
                cardHeaderProps: {
                    title: 'Complete Your Profile Information',
                    subheader: 'Please fill in your user profile information before proceeding to the system.'
                }
            }}
        >
            <div className="flex flex-1 flex-col gap-5 min-h-0 overflow-y-auto p-4 sm:p-6 pt-0 sm:pt-0 pb-6">
                <div className="bg-(--mui-palette-primary-50) border border-(--mui-palette-primary-200) rounded-(--mui-tokens-radius-md) p-3 flex gap-3 items-start">
                    <UserCircleIcon className="text-(--mui-palette-primary-main) shrink-0 mt-0.5" size={24} />
                    <div className="text-xs text-(--mui-palette-text-primary)">
                        <p className="font-semibold mb-0.5">Welcome to AU-JAS!</p>
                        <p className="text-(--mui-palette-text-secondary)">
                            Before you can operate, please complete your user profile.
                        </p>
                    </div>
                </div>

                {/* Dean Department Info */}
                {isDean && (
                    <div className="flex flex-col gap-2 p-4 border border-(--mui-palette-secondary-200) bg-(--mui-palette-secondary-50) rounded-(--mui-tokens-radius-md)">
                        <div className="flex items-center gap-2 font-semibold text-sm text-(--mui-palette-secondary-main)">
                            <BuildingsIcon size={20} />
                            <span>Governing Department</span>
                        </div>
                        <p className="text-xs text-(--mui-palette-text-secondary) m-0">
                            {userProfile?.department_name
                                ? `Assigned to: ${userProfile.department_code} — ${userProfile.department_name} (Assigned by Administrator)`
                                : 'Your academic department will be assigned by the Administrator.'}
                        </p>
                    </div>
                )}

                {/* Student Academic Info */}
                {isStudent && (
                    <div className="flex flex-col gap-2 p-4 border border-(--mui-palette-info-200) bg-(--mui-palette-info-50) rounded-(--mui-tokens-radius-md)">
                        <div className="flex items-center gap-2 font-semibold text-sm text-(--mui-palette-info-main)">
                            <GraduationCapIcon size={20} />
                            <span>Academic Program & Year Level</span>
                        </div>
                        <p className="text-xs text-(--mui-palette-text-secondary) m-0">
                            Your academic program and initial year level will be assigned directly by the Registrar's Office upon verification.
                        </p>
                    </div>
                )}

                {/* Personal Information */}
                <div className="flex flex-col gap-3">
                    <span className="font-semibold text-xs text-(--mui-palette-text-secondary) uppercase tracking-wide">
                        Personal Information
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="First Name"
                            placeholder="Given name"
                            required
                            size="small"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Middle Name"
                            placeholder="Middle name (optional)"
                            size="small"
                            value={middleName}
                            onChange={(e) => setMiddleName(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Last Name"
                            placeholder="Family name"
                            required
                            size="small"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Suffix"
                            placeholder="Jr., Sr., III (optional)"
                            size="small"
                            value={suffix}
                            onChange={(e) => setSuffix(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Preferred Name"
                            placeholder="Nickname (optional)"
                            size="small"
                            value={preferredName}
                            onChange={(e) => setPreferredName(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Mobile Number"
                            placeholder="e.g. 09171234567"
                            size="small"
                            value={mobileNumber}
                            onChange={(e) => setMobileNumber(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <CommonDatePicker
                            disabled={isSubmitting}
                            label="Date of Birth"
                            size="small"
                            value={dateOfBirth}
                            onChange={(val) => setDateOfBirth(val || '')}
                        />
                        <CommonSelect
                            disabled={isSubmitting}
                            fullWidth
                            label="Gender"
                            options={GENDER_OPTIONS}
                            size="small"
                            value={gender}
                            onChange={(e) => setGender(e.target.value as string)}
                        />
                        <CommonSelect
                            disabled={isSubmitting}
                            fullWidth
                            label="Civil Status"
                            options={CIVIL_STATUS_OPTIONS}
                            size="small"
                            value={civilStatus}
                            onChange={(e) => setCivilStatus(e.target.value as string)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Nationality"
                            placeholder="e.g. Filipino"
                            size="small"
                            value={nationality}
                            onChange={(e) => setNationality(e.target.value)}
                        />
                    </div>
                </div>

                {/* Address Information */}
                <div className="flex flex-col gap-3">
                    <span className="font-semibold text-xs text-(--mui-palette-text-secondary) uppercase tracking-wide">
                        Address Details (Optional)
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Address Line 1"
                            placeholder="House / Unit / Street"
                            size="small"
                            value={addressLine1}
                            onChange={(e) => setAddressLine1(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Address Line 2"
                            placeholder="Barangay / Subdivision"
                            size="small"
                            value={addressLine2}
                            onChange={(e) => setAddressLine2(e.target.value)}
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="City"
                            placeholder="City / Municipality"
                            size="small"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Province"
                            placeholder="Province"
                            size="small"
                            value={province}
                            onChange={(e) => setProvince(e.target.value)}
                        />
                        <CommonInput
                            disabled={isSubmitting}
                            fullWidth
                            label="Postal Code"
                            placeholder="ZIP / Postal code"
                            size="small"
                            value={postalCode}
                            onChange={(e) => setPostalCode(e.target.value)}
                        />
                    </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-(--mui-palette-divider)">
                    {isMandatory ? (
                        <CommonButton
                            color="error"
                            disabled={isSubmitting}
                            size="small"
                            startIcon={<SignOutIcon size={18} />}
                            variant="outlined"
                            onClick={handleLogout}
                        >
                            Sign Out
                        </CommonButton>
                    ) : (
                        <span />
                    )}
                    <div className="flex gap-2">
                        {!isMandatory && onClose && (
                            <CommonButton
                                disabled={isSubmitting}
                                size="small"
                                variant="outlined"
                                onClick={onClose}
                            >
                                Skip for Now
                            </CommonButton>
                        )}
                        <CommonButton
                            color="primary"
                            disabled={isSubmitting || !firstName.trim() || !lastName.trim() || (isDean && !selectedDepartmentId)}
                            loading={isSubmitting}
                            size="small"
                            variant="contained"
                            onClick={handleSubmit}
                        >
                            Save & Continue
                        </CommonButton>
                    </div>
                </div>
            </div>
        </CommonModal>
    );
}
