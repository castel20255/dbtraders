import React from 'react';
import { useDerivAuth } from '@/hooks/useDerivAuth';
import App from './App';

export const AuthWrapper = () => {
    // The useDerivAuth hook handles OAuth redirect automatically
    useDerivAuth();

    return <App />;
};
