import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { useDerivAuth } from '@/hooks/useDerivAuth';
import { localize } from '@deriv-com/translations';
import App from './App';

export const AuthWrapper = () => {
    const { isLoggedIn } = useDerivAuth();
    const [showApp, setShowApp] = React.useState(false);

    React.useEffect(() => {
        // Give auth a moment to initialize
        const timer = setTimeout(() => {
            set ShowApp(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    if (!showApp) {
        return <ChunkLoader message={localize('Initializing...')} />;
    }

    return <App />;
};
