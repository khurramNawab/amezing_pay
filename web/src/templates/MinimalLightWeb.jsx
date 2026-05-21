import React from 'react';
import { MapPin, Globe, Info, IndianRupee } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './MinimalLightWeb.css';

export default function MinimalLightWeb({ card }) {
  const {
    name, role, phone, email, profileImage, businessInfo, payment, socialLinks, products,
  } = card;

  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const upiId = payment?.upiId;
  const website = socialLinks?.website;

  return (
    <div className="minimal-light-container">
      <div className="minimal-light-card">
        <div className="minimal-light-content">
          {profileImage ? (
            <img src={profileImage} alt={name} className="minimal-light-image" />
          ) : (
            <div className="minimal-light-placeholder">
              <span>👤</span>
            </div>
          )}
          <h1 className="minimal-light-name">{name}</h1>
          <p className="minimal-light-role">{role}</p>
          
          {companyName && <p className="minimal-light-company">{companyName}</p>}
          {category && <p className="minimal-light-category">{category}</p>}

          <div className="minimal-light-details">
            <span className="minimal-light-contact-text">{phone}</span>
            <span className="minimal-light-bullet">•</span>
            <span className="minimal-light-contact-text">{email}</span>
          </div>

          <div className="minimal-light-info-rows">
            {upiId && (
              <div className="minimal-light-row">
                <IndianRupee size={14} color="#666" />
                <span>{upiId}</span>
              </div>
            )}
            {address && (
              <div className="minimal-light-row">
                <MapPin size={14} color="#666" />
                <span>{address}</span>
              </div>
            )}
            {website && (
              <div className="minimal-light-row">
                <Globe size={14} color="#666" />
                <span>{website.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {description && (
              <div className="minimal-light-row minimal-light-description">
                <Info size={14} color="#666" />
                <span>{description}</span>
              </div>
            )}
          </div>

          <SharedCardFooter card={card} accentColor="#111" iconColor="#fff" />
        </div>
      </div>
    </div>
  );
}
