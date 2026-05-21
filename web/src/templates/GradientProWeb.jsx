import React from 'react';
import { Phone, Mail, MapPin, Globe, Info } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './GradientProWeb.css';

export default function GradientProWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const website = socialLinks?.website;

  return (
    <div className="gradient-pro-container">
      <div className="gradient-pro-card">
        <div className="gradient-pro-header">
          {profileImage ? (
            <img src={profileImage} alt={name} className="gradient-pro-image" />
          ) : (
            <div className="gradient-pro-placeholder">👤</div>
          )}
          <div className="gradient-pro-header-text">
            <h1 className="gradient-pro-name">{name}</h1>
            <p className="gradient-pro-role">{role}</p>
            {companyName && <p style={{color: '#111', fontSize: '0.9rem', marginTop: '4px', fontWeight: 'bold'}}>{companyName}</p>}
            {category && <p style={{color: '#666', fontSize: '0.75rem', textTransform: 'uppercase'}}>{category}</p>}
          </div>
        </div>

        <div className="gradient-pro-links">
          <div className="gradient-pro-link-item">
            <Phone size={16} color="#4F46E5" />
            <span>{phone}</span>
          </div>
          <div className="gradient-pro-link-item">
            <Mail size={16} color="#4F46E5" />
            <span>{email}</span>
          </div>
          {address && (
            <div className="gradient-pro-link-item">
              <MapPin size={16} color="#4F46E5" />
              <span>{address}</span>
            </div>
          )}
          {website && (
            <div className="gradient-pro-link-item">
              <Globe size={16} color="#4F46E5" />
              <span>{website.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
          {description && (
            <div className="gradient-pro-link-item" style={{alignItems: 'flex-start'}}>
              <Info size={16} color="#4F46E5" style={{marginTop: '2px'}} />
              <span style={{lineHeight: '1.4'}}>{description}</span>
            </div>
          )}

          <SharedCardFooter card={card} accentColor="#4F46E5" iconColor="#fff" />
        </div>
      </div>
    </div>
  );
}
