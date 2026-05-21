import React from 'react';
import { ArrowRight, ShieldCheck, Smartphone, Zap } from 'lucide-react';
import './HomePage.css'; // Optional CSS if we need specific styles

const HomePage = () => {
  return (
    <div className="home-wrapper">
      {/* Background Orbs */}
      <div className="bg-orb orb-primary"></div>
      <div className="bg-orb orb-secondary"></div>

      {/* Navbar */}
      <nav className="navbar container">
        <div className="logo-section">
          <ShieldCheck size={32} color="#4F46E5" />
          <span className="logo-text">Amezing Pay</span>
        </div>
        <div className="nav-links">
          <a href="/terms" className="nav-link">Terms</a>
          <button className="btn-primary-outline">Get App</button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero container animate-fade-in">
        <h1 className="hero-title">
          Smart Earning <br />
          <span className="gradient-text">Premium Ecosystem</span>
        </h1>
        <p className="hero-subtitle">
          Create stunning virtual visiting cards, manage your business, and grow your network with Amezing Pay.
        </p>
        
        <div className="hero-cta">
          <button className="btn-primary">
            Download App <ArrowRight size={18} />
          </button>
        </div>
      </header>

      {/* Features */}
      <section className="features container animate-fade-in" style={{ animationDelay: '0.2s' }}>
        <div className="glass-panel feature-card">
          <Smartphone size={32} color="#818cf8" />
          <h3>Virtual Cards</h3>
          <p>Share your professional identity instantly with a beautiful QR-based virtual card.</p>
        </div>
        <div className="glass-panel feature-card">
          <Zap size={32} color="#22d3ee" />
          <h3>Instant Sharing</h3>
          <p>Anyone can view your card from any browser, no app required.</p>
        </div>
        <div className="glass-panel feature-card">
          <ShieldCheck size={32} color="#4ade80" />
          <h3>Secure & Private</h3>
          <p>End-to-end encrypted platform for safe networking and smart earning.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer container">
        <p>&copy; {new Date().getFullYear()} Amezing Pay. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default HomePage;
