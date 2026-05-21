import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsPage = () => {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px' }}>
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', marginBottom: '40px' }}>
        <ArrowLeft size={20} /> Back to Home
      </Link>
      
      <h1 style={{ fontSize: '2.5rem', marginBottom: '24px' }}>Terms & Conditions</h1>
      
      <div className="glass-panel" style={{ padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <section>
          <h2 style={{ color: 'var(--primary)', marginBottom: '12px' }}>1. Acceptance of Terms</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            By accessing or using the Amezing Pay platform, you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our services.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--primary)', marginBottom: '12px' }}>2. Virtual Cards</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Users are solely responsible for the information they share via their Virtual Visiting Cards. Amezing Pay does not verify the authenticity of user-provided business details.
          </p>
        </section>

        <section>
          <h2 style={{ color: 'var(--primary)', marginBottom: '12px' }}>3. Privacy</h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Your privacy is important to us. Virtual cards are public by nature. Any information you put on your card will be accessible to anyone with the QR code or link.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsPage;
