import CommonFormModal from '@components/modal/CommonFormModal';
import ValidCommonMultiSelect from '@components/select/ValidCommonMultiSelect';
import { useSectionOptions } from '@pages/dean/section-management/useSectionOptions';
import { copySectionSetupToSections } from '@services/section.service';
import { useForm } from 'react-hook-form';

const COPY_SETUP_FORM_ID = 'copy-section-setup-form';

interface CopySectionSetupFormValues {
    target_section_ids: string[];
}

interface CopySectionSetupModalProps {
    open: boolean;
    sourceSectionId: string | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CopySectionSetupModal({
    open,
    sourceSectionId,
    onClose,
    onSuccess
}: CopySectionSetupModalProps) {
    const { sectionOptions } = useSectionOptions();

    const { control, handleSubmit, reset } = useForm<CopySectionSetupFormValues>({
        defaultValues: { target_section_ids: [] }
    });

    const targetOptions = sectionOptions.filter((option) => option.value !== sourceSectionId);

    async function handleCopySubmit(values: CopySectionSetupFormValues) {
        if (!sourceSectionId) {
            return;
        }

        const result = await copySectionSetupToSections(
            sourceSectionId,
            values.target_section_ids
        );

        if (!result.error) {
            reset({ target_section_ids: [] });
            onSuccess();
            onClose();
        }
    }

    function handleClose() {
        reset({ target_section_ids: [] });
        onClose();
    }

    return (
        <CommonFormModal
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Clone this section\'s grading components into other sections, matched period by period.',
                    title: 'Copy Grading Setup'
                }
            }}
            confirmText="Copy Setup"
            formContent={
                <form
                    className="flex flex-col gap-3"
                    id={COPY_SETUP_FORM_ID}
                    onSubmit={handleSubmit(handleCopySubmit)}
                >
                    <span className="font-medium text-(--mui-palette-text-primary) text-sm">
                        Target Sections
                    </span>
                    <ValidCommonMultiSelect
                        control={control}
                        hasHelper
                        helperText="Existing components in each target period are replaced. Periods already holding recorded grades are skipped."
                        name="target_section_ids"
                        options={targetOptions}
                        placeholder="Select sections"
                        rules={{
                            validate: function(value: string | string[]) {
                                return (Array.isArray(value) && value.length > 0)
                                    || 'Select at least one target section';
                            }
                        }}
                    />
                </form>
            }
            formId={COPY_SETUP_FORM_ID}
            open={open}
            onClose={handleClose}
        />
    );
}