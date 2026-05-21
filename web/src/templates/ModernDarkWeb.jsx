import React from 'react';
import { Phone, Mail, Globe, IndianRupee } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './ModernDarkWeb.css';

export default function ModernDarkWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, payment, socialLinks } = card;
  const companyName = businessInfo?.name;
  const upiId = payment?.upiId;
  const website = socialLinks?.website;

  return (
    <div className="modern-dark-container">
      <div className="modern-dark-card">
        <div className="modern-dark-accent" />
        <div className="modern-dark-content">
          {profileImage ? (
            <img src={profileImage} alt={name} className="modern-dark-image" />
          ) : (
            <div className="modern-dark-placeholder">👤</div>
          )}
          
          <div className="modern-dark-right">
            <h1 className="modern-dark-name">{name}</h1>
            <p className="modern-dark-role">{role}</p>
            {companyName && <p className="modern-dark-company">{companyName}</p>}
            
            <div className="modern-dark-separator" />
            
            <div className="modern-dark-icon-row">
              <Phone size={14} color="#4F46E5" />
              <span>{phone}</span>
            </div>
            <div className="modern-dark-icon-row">
              <Mail size={14} color="#4F46E5" />
              <span>{email}</span>
            </div>
            {upiId && (
              <div className="modern-dark-icon-row">
                <IndianRupee size={14} color="#4F46E5" />
                <span>{upiId}</span>
              </div>
            )}
            {website && (
              <div className="modern-dark-icon-row">
                <Globe size={14} color="#4F46E5" />
                <span>{website.replace(/^https?:\/\//i, "")}</span>
              </div>
            )}

            <SharedCardFooter card={card} accentColor="#4F46E5" iconColor="#fff" />
          </div>
        </div>
      </div>
    </div>
  );
}
