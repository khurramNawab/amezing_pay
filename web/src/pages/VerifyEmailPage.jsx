import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import './VerifyEmailPage.css';

const getApiBase = () => {
    const rawUrl = import.meta.env.VITE_API_URL;
    if (rawUrl) {
        return rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;
    }
    return `http://${window.location.hostname}:4050/api`;
};

const API_BASE = getApiBase();

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('loading'); // loading | success | error | notoken
    const [message, setMessage] = useState('');

    const verifiedRef = React.useRef(false);

    useEffect(() => {
        if (!token || verifiedRef.current) {
            if (!token) setStatus('notoken');
            return;
        }

        verifiedRef.current = true;

        const verify = async () => {
            try {
                const res = await fetch(`${API_BASE}/auth/verify-email/${token}`);
                const data = await res.json();

                if (res.ok && data.success) {
                    setStatus('success');
                    setMessage(data.message || 'Email verified successfully!');
                } else {
                    setStatus('error');
                    setMessage(data.message || 'Verification failed. The link may have expired.');
                }
            } catch (err) {
                setStatus('error');
                setMessage('Unable to connect to the server. Please try again later.');
            }
        };

        verify();
    }, [token]);

    return (
        <div className="vep-bg">
            {/* Animated background orbs */}
            <div className="vep-orb vep-orb-1" />
            <div className="vep-orb vep-orb-2" />
            <div className="vep-orb vep-orb-3" />

            <div className="vep-container">
                {/* Logo */}
                <div className="vep-logo">
                    <img src="/logo.png" alt="AmazingPay Logo" className="vep-logo-img" />
                    <span className="vep-logo-text">AmazingPay</span>
                </div>

                <div className="vep-card">
                    {status === 'loading' && (
                        <div className="vep-state">
                            <div className="vep-spinner" />
                            <h2>Verifying your email…</h2>
                            <p>Please wait while we confirm your email address.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="vep-state">
                            <div className="vep-icon vep-icon-success">✅</div>
                            <h2>Email Verified!</h2>
                            <p>{message}</p>
                            <div className="vep-steps">
                                <div className="vep-step">
                                    <span className="vep-step-num">1</span>
                                    <span>Open the <strong>AmazingPay app</strong> on your phone</span>
                                </div>
                                <div className="vep-step">
                                    <span className="vep-step-num">2</span>
                                    <span>Login with your <strong>email</strong> and <strong>password</strong></span>
                                </div>
                                <div className="vep-step">
                                    <span className="vep-step-num">3</span>
                                    <span>Enjoy your <strong>verified account</strong> benefits</span>
                                </div>
                            </div>
                            <Link to="/" className="vep-btn vep-btn-success">Go to Homepage →</Link>
                        </div>
                    )}

                    {(status === 'error' || status === 'notoken') && (
                        <div className="vep-state">
                            <div className="vep-icon vep-icon-error">❌</div>
                            <h2>Verification Failed</h2>
                            <p>{status === 'notoken' ? 'No verification token was found in this link.' : message}</p>
                            <div className="vep-info-box">
                                <span className="vep-info-icon">💡</span>
                                <span>Open the AmazingPay app and go to <strong>Profile → Resend Verification Email</strong> to get a new link.</span>
                            </div>
                            <Link to="/" className="vep-btn vep-btn-error">Back to Homepage</Link>
                        </div>
                    )}
                </div>

                <p className="vep-footer">
                    © {new Date().getFullYear()} AmazingPay · Secure Fintech Platform
                </p>
            </div>
        </div>
    );
}
