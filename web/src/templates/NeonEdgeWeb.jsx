import React from 'react';
import { Phone, Mail, MapPin, Globe, Info } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './NeonEdgeWeb.css';

export default function NeonEdgeWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const website = socialLinks?.website;

  return (
    <div className="neon-edge-container">
      <div className="neon-edge-glow-box">
        <div className="neon-edge-inner">
          
          <div className="neon-edge-avatar-section">
            {profileImage ? (
              <img src={profileImage} alt={name} className="neon-edge-image" />
            ) : (
              <div className="neon-edge-placeholder">⚡</div>
            )}
            <div className="neon-edge-titles">
              <h1 className="neon-edge-name">{name}</h1>
              <p className="neon-edge-role">{role}</p>
              {companyName && <p style={{color: '#EEE', fontSize: '0.9rem', marginTop: '4px'}}>{companyName}</p>}
              {category && <p style={{color: '#888', fontSize: '0.75rem', textTransform: 'uppercase'}}>{category}</p>}
            </div>
          </div>
          
          <div className="neon-edge-line" />
          
          <div className="neon-edge-bottom-section">
            <a href={`tel:${phone}`} className="neon-edge-contact-item">
              <Phone size={18} color="#00FFCC" />
              <span>{phone}</span>
            </a>
            <a href={`mailto:${email}`} className="neon-edge-contact-item">
              <Mail size={18} color="#00FFCC" />
              <span>{email}</span>
            </a>
            {address && (
              <div className="neon-edge-contact-item" style={{pointerEvents: 'none'}}>
                <MapPin size={18} color="#00FFCC" />
                <span>{address}</span>
              </div>
            )}
            {website && (
              <a href={website.startsWith('http') ? website : `https://${website}`} target="_blank" rel="noreferrer" className="neon-edge-contact-item">
                <Globe size={18} color="#00FFCC" />
                <span>{website.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
            {description && (
              <div className="neon-edge-contact-item" style={{pointerEvents: 'none', alignItems: 'flex-start'}}>
                <Info size={18} color="#00FFCC" />
                <span style={{lineHeight: '1.4'}}>{description}</span>
              </div>
            )}
          </div>

          <SharedCardFooter card={card} accentColor="#00FFCC" iconColor="#111" />
        </div>
      </div>
    </div>
  );
}
