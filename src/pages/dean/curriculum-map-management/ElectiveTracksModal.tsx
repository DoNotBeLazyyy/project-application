import CommonButton from '@components/button/CommonButton';
import CommonModal from '@components/modal/CommonModal';
import CommonTextarea from '@components/textarea/CommonTextarea';
import { setProgramElectiveTracks } from '@services/curriculum-map.service';
import { ChangeEvent, useEffect, useState } from 'react';

interface ElectiveTracksModalProps {
    open: boolean;
    programId: string;
    tracks: string[];
    onClose: VoidFunction;
    onSaved: VoidFunction;
}

function parseTracks(text: string): string[] {
    return text
        .split('\n')
        .map((line) => line.replace(/^\s*-\s*/, '')
            .trim())
        .filter(Boolean);
}

/**
 * Edits the elective track names printed in the curriculum's ELECTIVES box,
 * one per line.
 *
 * Usage:
 *  <ElectiveTracksModal open={isOpen} programId={id} tracks={tracks} onClose={close} onSaved={reload} />
 */
export default function ElectiveTracksModal({
    open,
    programId,
    tracks,
    onClose,
    onSaved
}: ElectiveTracksModalProps) {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(function() {
        if (open) {
            setText(tracks.join('\n'));
        }
    }, [open, tracks]);

    function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        setText(event.target.value);
    }

    async function handleSave() {
        setIsSaving(true);
        const result = await setProgramElectiveTracks(programId, parseTracks(text));
        setIsSaving(false);

        if (!result.error) {
            onSaved();
            onClose();
        }
    }

    return (
        <CommonModal
            cardProps={{
                cardHeaderProps: {
                    subheader: 'Listed in the ELECTIVES box of the printed curriculum. One track per line.',
                    title: 'Elective Tracks'
                }
            }}
            fullWidth
            maxWidth="sm"
            open={open}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <CommonTextarea
                    fullWidth
                    placeholder={'Systems Fundamentals\nGraphics & Visual Computing\nIntelligent Systems'}
                    value={text}
                    onChange={handleChange}
                />
                <div className="flex gap-2 justify-end">
                    <CommonButton
                        color="inherit"
                        disabled={isSaving}
                        size="small"
                        variant="outlined"
                        onClick={onClose}
                    >
                        Cancel
                    </CommonButton>
                    <CommonButton
                        disabled={isSaving}
                        loading={isSaving}
                        size="small"
                        variant="contained"
                        onClick={handleSave}
                    >
                        Save Tracks
                    </CommonButton>
                </div>
            </div>
        </CommonModal>
    );
}