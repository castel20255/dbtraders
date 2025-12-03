import React from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import { useDerivAuth } from '@/hooks/useDerivAuth';
import App from './App';

export const AuthWrapper = () => {
    const { isLoggedIn } = useDerivAuth();
    const [showApp, setShowApp] = React.useState(false);

    React.useEffect(() => {
        // Give auth a moment to initialize
        const timer = setTimeout(() => {
            setShowApp(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    if (!showApp) {
        return <ChunkLoader />;
    }

    return <App />;
};
