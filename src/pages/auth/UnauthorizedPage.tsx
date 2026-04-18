import CommonButton from '@components/button/CommonButton';
import { Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function UnauthorizedPage() {
    const navigate = useNavigate();

    function handleBack() {
        navigate(-1);
    }

    return (
        <div className="flex flex-col gap-4 h-full items-center justify-center w-full">
            <Typography variant="h3">
                403
            </Typography>
            <Typography variant="h5">
                Access Denied
            </Typography>
            <Typography
                color="text.secondary"
                variant="body1"
            >
                You do not have permission to view this page.
            </Typography>
            <CommonButton
                variant="outlined"
                onClick={handleBack}
            >
                Go Back
            </CommonButton>
        </div>
    );
}