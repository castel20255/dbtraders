import { useEffect, useState } from 'react';

const APP_ID = '113536';

export function useDerivAuth() {
    const [token, setToken] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const loginWithDeriv = () => {
        if (typeof window === 'undefined') return;

        const redirectUri = encodeURIComponent(window.location.href.split('?')[0]);
        const oauthUrl = `https://oauth.deriv.com/oauth2/authorize?app_id=${APP_ID}&redirect_uri=${redirectUri}`;

        console.log('[Auth] 🔐 Initiating OAuth login...');
        window.location.href = oauthUrl;
    };

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const urlParams = new URLSearchParams(window.location.search);
        let oauthToken = urlParams.get('token');

        if (!oauthToken) {
            for (let i = 1; i < 5; i++) {
                const tokenKey = `token${i}`;
                if (urlParams.has(tokenKey)) {
                    oauthToken = urlParams.get(tokenKey);
                    break;
                }
            }
        }

        const accountsFromUrl = [];
        for (let i = 1; i < 5; i++) {
            const acctKey = `acct${i}`;
            const tokenKey = `token${i}`;
            const curKey = `cur${i}`;
            if (urlParams.has(acctKey) && urlParams.has(tokenKey) && urlParams.has(curKey)) {
                accountsFromUrl.push({
                    id: urlParams.get(acctKey),
                    token: urlParams.get(tokenKey),
                    currency: urlParams.get(curKey),
                });
            }
        }

        if (oauthToken) {
            console.log('[Auth] ✅ OAuth token found in URL');

            // Store in the format expected by the existing bot system
            const accountsList: Record<string, string> = {};
            const clientAccounts: Record<string, any> = {};

            accountsFromUrl.forEach((acc: any) => {
                accountsList[acc.id] = acc.token;
                clientAccounts[acc.id] = {
                    loginid: acc.id,
                    token: acc.token,
                    currency: acc.currency,
                };
            });

            localStorage.setItem('accountsList', JSON.stringify(accountsList));
            localStorage.setItem('clientAccounts', JSON.stringify(clientAccounts));
            localStorage.setItem('authToken', accountsFromUrl[0]?.token || oauthToken);
            localStorage.setItem('active_loginid', accountsFromUrl[0]?.id || '');

            setToken(oauthToken);
            setIsLoggedIn(true);

            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        const storedToken = localStorage.getItem('authToken');

        if (storedToken && storedToken.length > 10) {
            console.log('[Auth] ✅ Existing API token found');
            setToken(storedToken);
            setIsLoggedIn(true);
        } else {
            console.log('[Auth] ℹ No API token found, initiating OAuth login');
            loginWithDeriv();
        }
    }, []);

    const logout = () => {
        if (typeof window === 'undefined') return;

        console.log('[Auth] 👋 Logging out...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('active_loginid');
        localStorage.removeItem('accountsList');
        localStorage.removeItem('clientAccounts');
        setToken('');
        setIsLoggedIn(false);
        console.log('[Auth] ✅ Logged out successfully');
        loginWithDeriv();
    };

    return {
        token,
        isLoggedIn,
        isAuthenticated: isLoggedIn,
        loginWithDeriv,
        logout,
    };
}

