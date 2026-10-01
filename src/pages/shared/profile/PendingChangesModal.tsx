import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import { CommonChip } from '@components/badge/CommonChip';
import { ClockCountdownIcon } from '@phosphor-icons/react';
import { PendingProfileRequest } from '@type/profile.type';

interface PendingChangesModalProps {
    open: boolean;
    onClose: () => void;
    pendingRequest?: PendingProfileRequest | null;
}

const FIELD_LABELS: Record<string, string> = {
    first_name: 'First Name',
    middle_name: 'Middle Name',
    last_name: 'Last Name',
    suffix: 'Suffix',
    preferred_name: 'Preferred Name',
    mobile_number: 'Mobile Number',
    date_of_birth: 'Date of Birth',
    gender: 'Gender',
    civil_status: 'Civil Status',
    nationality: 'Nationality',
    address_line1: 'Address Line 1',
    address_line2: 'Address Line 2',
    city: 'City / Municipality',
    province: 'Province',
    postal_code: 'Postal Code',
    program_name: 'Academic Program',
    year_level: 'Year Level'
};

export default function PendingChangesModal({
    open,
    onClose,
    pendingRequest
}: PendingChangesModalProps) {
    if (!pendingRequest) return null;

    const requested = pendingRequest.requested_changes || {};
    const current = pendingRequest.current_values || {};

    const allKeys = Object.keys(FIELD_LABELS);
    const changedFields = allKeys.filter(
        (key) => (requested[key as keyof typeof requested] || '') !== (current[key as keyof typeof current] || '')
    );

    return (
        <CommonModal
            fullWidth
            maxWidth="md"
            open={open}
            onClose={onClose}
            cardProps={{
                cardHeaderProps: {
                    title: 'Submitted Profile Changes',
                    subheader: `Submitted on ${new Date(pendingRequest.created_at).toLocaleString()} — Pending Registrar Verification`
                }
            }}
        >
            <div className="flex flex-col gap-4 p-4 pt-0 max-h-[75vh] overflow-y-auto">
                <div className="border border-(--mui-palette-warning-main) bg-(--mui-palette-warning-light) p-3 rounded-lg flex items-start gap-3 text-xs text-(--mui-palette-text-primary)">
                    <ClockCountdownIcon size={22} className="text-(--mui-palette-warning-main) shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold m-0 text-sm">Under Review by Registrar</p>
                        <p className="m-0 mt-0.5 text-(--mui-palette-text-secondary)">
                            These changes have not yet been applied to your official record. Once a registrar verifies and approves your submission, your profile will be updated.
                        </p>
                    </div>
                </div>

                <div className="border border-(--mui-palette-divider) rounded-lg overflow-hidden">
                    <div className="grid grid-cols-12 bg-(--mui-palette-background-default) px-3 py-2 text-xs font-semibold text-(--mui-palette-text-secondary) border-b border-(--mui-palette-divider)">
                        <div className="col-span-4">Field</div>
                        <div className="col-span-4">Current Value</div>
                        <div className="col-span-4">Requested Value</div>
                    </div>
                    <div className="divide-y divide-(--mui-palette-divider) text-xs">
                        {changedFields.length === 0 ? (
                            <div className="p-4 text-center text-(--mui-palette-text-secondary)">
                                No differences detected.
                            </div>
                        ) : (
                            changedFields.map((key) => {
                                const currVal = current[key as keyof typeof current] || '—';
                                const reqVal = requested[key as keyof typeof requested] || '—';
                                return (
                                    <div key={key} className="grid grid-cols-12 px-3 py-2.5 items-center bg-(--mui-palette-warning-light)/20">
                                        <div className="col-span-4 font-medium text-(--mui-palette-text-primary) flex items-center gap-1.5">
                                            <span>{FIELD_LABELS[key] || key}</span>
                                            <CommonChip label="Changed" size="small" variant="light" />
                                        </div>
                                        <div className="col-span-4 text-(--mui-palette-text-secondary) break-words pr-2">
                                            {currVal}
                                        </div>
                                        <div className="col-span-4 font-medium text-(--mui-palette-primary-main) break-words">
                                            {reqVal}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                <div className="flex justify-end mt-2">
                    <CommonButton size="small" variant="contained" onClick={onClose}>
                        Close
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}
