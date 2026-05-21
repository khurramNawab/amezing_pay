import React from 'react';
import { Phone, Mail, MapPin, Globe, Info } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './GlassCardWeb.css';

export default function GlassCardWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const website = socialLinks?.website;

  return (
    <div className="glass-card-container">
      <div className="glass-card-blob blob-1" />
      <div className="glass-card-blob blob-2" />
      
      <div className="glass-card-wrapper">
        <div className="glass-card-inner">
          <div className="glass-card-row">
            {profileImage ? (
              <img src={profileImage} alt={name} className="glass-card-image" />
            ) : (
              <div className="glass-card-placeholder">👤</div>
            )}
            <div className="glass-card-text">
              <h1 className="glass-card-name">{name}</h1>
              <p className="glass-card-role">{role}</p>
              {companyName && <p style={{color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem', marginTop: '4px'}}>{companyName}</p>}
              {category && <p style={{color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', textTransform: 'uppercase'}}>{category}</p>}
            </div>
          </div>
          
          <div className="glass-card-footer">
            <div className="glass-card-contact">
              <Phone size={14} />
              <span>{phone}</span>
            </div>
            <div className="glass-card-contact">
              <Mail size={14} />
              <span>{email}</span>
            </div>
            {address && (
              <div className="glass-card-contact">
                <MapPin size={14} />
                <span>{address}</span>
              </div>
            )}
            {website && (
              <div className="glass-card-contact">
                <Globe size={14} />
                <span>{website.replace(/^https?:\/\//, '')}</span>
              </div>
            )}
            {description && (
              <div className="glass-card-contact" style={{ alignItems: 'flex-start' }}>
                <Info size={14} style={{ marginTop: '2px' }} />
                <span style={{ lineHeight: '1.4' }}>{description}</span>
              </div>
            )}
          </div>

          <SharedCardFooter card={card} accentColor="#3b82f6" iconColor="#fff" />
        </div>
      </div>
    </div>
  );
}
