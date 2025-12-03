import { useEffect, useState } from 'react';

interface Balance {
    amount: number;
    currency: string;
}

interface Account {
    id: string;
    type: 'Demo' | 'Real';
    currency: string;
}

const APP_ID = '113536';

export function useDerivAuth() {
    const [token, setToken] = useState<string>('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [balance, setBalance] = useState<Balance | null>(null);
    const [accountType, setAccountType] = useState<'Demo' | 'Real' | null>(null);
    const [accountCode, setAccountCode] = useState<string>('');
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [activeLoginId, setActiveLoginId] = useState<string | null>(null);
    const [wsRef, setWsRef] = useState<WebSocket | null>(null);
    const [balanceSubscribed, setBalanceSubscribed] = useState(false);

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
            localStorage.setItem('deriv_api_token', oauthToken);
            setToken(oauthToken);
            connectWithToken(oauthToken);

            if (accountsFromUrl.length > 0) {
                localStorage.setItem('deriv_accounts', JSON.stringify(accountsFromUrl));
            }

            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        const storedToken = localStorage.getItem('deriv_api_token');

        if (storedToken && storedToken.length > 10) {
            console.log('[Auth] ✅ Existing API token found');
            setToken(storedToken);
            connectWithToken(storedToken);
        } else {
            console.log('[Auth] ℹ No API token found, initiating OAuth login');
            loginWithDeriv();
        }

        return () => {
            if (wsRef) {
                wsRef.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const connectWithToken = (apiToken: string) => {
        if (!apiToken || apiToken.length < 10) {
            console.error('[Auth] ❌ Invalid API token');
            return;
        }

        if (wsRef) {
            wsRef.close();
        }

        console.log('[Auth] 🔌 Connecting to Deriv WebSocket...');
        const ws = new WebSocket(`wss://ws.derivws.com/websockets/v3?app_id=${APP_ID}`);

        ws.onopen = () => {
            console.log('[Auth] ✅ WebSocket connected');
            ws.send(JSON.stringify({ authorize: apiToken }));
        };

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.error) {
                console.error('[Auth] ❌ WebSocket error:', data.error.message);
                if (data.error.code === 'InvalidToken') {
                    console.log('[Auth] ⚠ Invalid token, re-initiating OAuth login');
                    loginWithDeriv();
                }
                return;
            }

            if (data.msg_type === 'authorize' && data.authorize) {
                const { authorize } = data;
                const accType = authorize.is_virtual ? 'Demo' : 'Real';
                const accCode = authorize.loginid || '';

                console.log('[Auth] ✅ Authorized:', authorize.loginid, `(${accType})`);
                console.log('[Auth] 💰 Balance:', authorize.balance, authorize.currency);

                setAccountType(accType);
                setActiveLoginId(authorize.loginid);
                setAccountCode(accCode);
                setIsLoggedIn(true);

                const allAccounts = [];
                const storedAccounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');

                if (authorize.account_list && Array.isArray(authorize.account_list)) {
                    console.log('[Auth] 📋 Found', authorize.account_list.length, 'linked accounts');
                    const formatted = authorize.account_list.map((acc: any) => ({
                        id: acc.loginid,
                        type: acc.is_virtual ? 'Demo' : 'Real',
                        currency: acc.currency,
                    }));
                    allAccounts.push(...formatted);
                }

                if (storedAccounts.length > 0) {
                    storedAccounts.forEach((storedAcc: any) => {
                        if (!allAccounts.find((acc) => acc.id === storedAcc.id)) {
                            allAccounts.push({
                                id: storedAcc.id,
                                type: storedAcc.id.includes('VR') ? 'Demo' : 'Real',
                                currency: storedAcc.currency,
                            });
                        }
                    });
                }

                setAccounts(allAccounts);

                if (!balanceSubscribed) {
                    ws.send(JSON.stringify({ forget_all: ['balance'] }));
                    setTimeout(() => {
                        ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
                        setBalanceSubscribed(true);
                        console.log('[Auth] ✅ Balance subscription started');
                    }, 100);
                }
            }

            if (data.msg_type === 'balance' && data.balance) {
                console.log('[Auth] 💰 Balance update:', data.balance.balance, data.balance.currency);
                setBalance({
                    amount: data.balance.balance,
                    currency: data.balance.currency,
                });
            }
        };

        ws.onclose = () => {
            console.log('[Auth] 🔌 WebSocket disconnected');
            setBalanceSubscribed(false);
        };

        ws.onerror = (error) => {
            console.error('[Auth] ❌ WebSocket error:', error);
        };

        setWsRef(ws);
    };

    const logout = () => {
        if (typeof window === 'undefined') return;

        console.log('[Auth] 👋 Logging out...');
        if (wsRef) {
            wsRef.send(JSON.stringify({ forget_all: ['balance', 'ticks', 'proposal_open_contract'] }));
            wsRef.close();
        }
        localStorage.removeItem('deriv_api_token');
        localStorage.removeItem('deriv_token');
        localStorage.removeItem('deriv_account');
        localStorage.removeItem('deriv_accounts');
        setToken('');
        setIsLoggedIn(false);
        setBalance(null);
        setAccountType(null);
        setAccountCode('');
        setAccounts([]);
        setActiveLoginId(null);
        setBalanceSubscribed(false);
        console.log('[Auth] ✅ Logged out successfully');
        loginWithDeriv();
    };

    const switchAccount = (loginId: string) => {
        if (typeof window === 'undefined') return;

        console.log('[Auth] 🔄 Switching to account:', loginId);

        const storedAccounts = JSON.parse(localStorage.getItem('deriv_accounts') || '[]');
        const accountInfo = storedAccounts.find((acc: any) => acc.id === loginId);
        const apiToken = accountInfo ? accountInfo.token : localStorage.getItem('deriv_api_token');

        if (!apiToken) {
            console.error(`[Auth] ❌ No token found for account ${loginId}`);
            logout();
            return;
        }

        localStorage.setItem('deriv_api_token', apiToken);
        setToken(apiToken);

        connectWithToken(apiToken);
    };

    return {
        token,
        isLoggedIn,
        isAuthenticated: isLoggedIn,
        loginWithDeriv,
        logout,
        balance,
        accountType,
        accountCode,
        accounts,
        switchAccount,
        activeLoginId,
    };
}
