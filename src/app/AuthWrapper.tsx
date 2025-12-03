import { useEffect, useState } from 'react';
import ChunkLoader from '@/components/loader/chunk-loader';
import App from './App';

const APP_ID = '113536';

export const AuthWrapper = () => {
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const handleAuth = () => {
            const urlParams = new URLSearchParams(window.location.search);

            // Check for OAuth callback tokens
            const accounts = [];
            for (let i = 1; i <= 5; i++) {
                const acct = urlParams.get(`acct${i}`);
                const token = urlParams.get(`token${i}`);
                const cur = urlParams.get(`cur${i}`);

                if (acct && token) {
                    accounts.push({ loginid: acct, token, currency: cur || 'USD' });
                }
            }

            // If we have OAuth tokens in URL, store them
            if (accounts.length > 0) {
                const accountsList: Record<string, string> = {};
                const clientAccounts: Record<string, any> = {};

                accounts.forEach(acc => {
                    accountsList[acc.loginid] = acc.token;
                    clientAccounts[acc.loginid] = acc;
                });

                localStorage.setItem('accountsList', JSON.stringify(accountsList));
                localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
                localStorage.setItem('authToken', accounts[0].token);
                localStorage.setItem('active_loginid', accounts[0].loginid);

                // Clean URL
                window.history.replaceState({}, '', window.location.pathname);
                setIsReady(true);
                return;
            }

            // Check if we already have tokens
            const existingToken = localStorage.getItem('authToken');
            if (existingToken) {
                setIsReady(true);
                return;
            }

            // No tokens - redirect to OAuth
            const redirectUri = encodeURIComponent(window.location.origin);
            window.location.href = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&redirect_uri=${redirectUri}`;
        };

        handleAuth();
    }, []);

    if (!isReady) {
        return <ChunkLoader />;
    }

    return <App />;
};
