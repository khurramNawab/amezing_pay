import React from 'react';
import { MapPin, Info, Globe, Building2 } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './CreativePortfolioWeb.css';

export default function CreativePortfolioWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const website = socialLinks?.website;

  return (
    <div className="creative-portfolio-container">
      <div className="creative-portfolio-card">
        <div className="creative-portfolio-header">
          {profileImage ? (
            <img src={profileImage} alt={name} className="creative-portfolio-image" />
          ) : (
            <div className="creative-portfolio-placeholder" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
               <span style={{ fontSize: '8rem', color: 'rgba(255,255,255,0.2)', fontWeight: 'bold' }}>{name?.charAt(0)?.toUpperCase() || 'U'}</span>
            </div>
          )}
          <div className="creative-portfolio-overlay">
            <h1 className="creative-portfolio-name">{name}</h1>
            <p className="creative-portfolio-role">{role}</p>
            {companyName && <p style={{color: '#EEE', fontSize: '0.9rem', marginTop: '4px', fontWeight: '500'}}>{companyName}</p>}
            {category && <p style={{color: '#BBB', fontSize: '0.75rem', textTransform: 'uppercase', marginTop: '2px'}}>{category}</p>}
          </div>
        </div>
        
        <div className="creative-portfolio-bottom">
          <div className="creative-portfolio-row">
            <span className="creative-portfolio-bold-label">P.</span>
            <span className="creative-portfolio-text-val">{phone}</span>
          </div>
          <div className="creative-portfolio-row">
            <span className="creative-portfolio-bold-label">E.</span>
            <span className="creative-portfolio-text-val">{email}</span>
          </div>
          
          {address && (
            <div className="creative-portfolio-row">
              <span className="creative-portfolio-bold-label"><MapPin size={20} color="#111" /></span>
              <span className="creative-portfolio-text-val">{address}</span>
            </div>
          )}

          {website && (
            <div className="creative-portfolio-row">
              <span className="creative-portfolio-bold-label"><Globe size={20} color="#111" /></span>
              <span className="creative-portfolio-text-val">{website.replace(/^https?:\/\//, '')}</span>
            </div>
          )}

          {description && (
            <div className="creative-portfolio-row" style={{ alignItems: 'flex-start' }}>
              <span className="creative-portfolio-bold-label"><Info size={20} color="#111" /></span>
              <span className="creative-portfolio-text-val" style={{ lineHeight: '1.4' }}>{description}</span>
            </div>
          )}

          <SharedCardFooter card={card} accentColor="#111" iconColor="#fff" />
        </div>
      </div>
    </div>
  );
}
