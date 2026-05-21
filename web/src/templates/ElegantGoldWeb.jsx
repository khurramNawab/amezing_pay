import React from 'react';
import { MapPin, Info, Globe } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './ElegantGoldWeb.css';

export default function ElegantGoldWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const website = socialLinks?.website;

  return (
    <div className="elegant-gold-container">
      <div className="elegant-gold-border-frame">
        <div className="elegant-gold-content">
          <h1 className="elegant-gold-name">{name}</h1>
          <p className="elegant-gold-role">{role}</p>
          {companyName && <p style={{color: '#D4AF37', fontSize: '0.9rem', marginTop: '6px'}}>{companyName}</p>}
          {category && <p style={{color: '#777', fontSize: '0.75rem', textTransform: 'uppercase'}}>{category}</p>}
          
          <div className="elegant-gold-center-art">
            <div className="elegant-gold-line" />
            {profileImage ? (
              <img src={profileImage} alt={name} className="elegant-gold-image" />
            ) : (
              <div className="elegant-gold-placeholder">◈</div>
            )}
            <div className="elegant-gold-line" />
          </div>

          <p className="elegant-gold-contact">{phone}</p>
          <p className="elegant-gold-contact">{email}</p>
          {website && <p className="elegant-gold-contact" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><Globe size={14} color="#D4AF37" /> {website.replace(/^https?:\/\//, '')}</p>}
          {address && <p className="elegant-gold-contact" style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'}}><MapPin size={14} color="#D4AF37" /> {address}</p>}
          {description && <p className="elegant-gold-contact" style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'center', gap: '6px', fontSize: '0.8rem', lineHeight: '1.4', marginTop: '6px'}}><Info size={14} color="#D4AF37" /> {description}</p>}

          <SharedCardFooter card={card} accentColor="#D4AF37" iconColor="#111" />
        </div>
      </div>
    </div>
  );
}
