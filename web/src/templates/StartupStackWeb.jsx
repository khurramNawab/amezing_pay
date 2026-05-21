import React from 'react';
import { Phone, Mail, MapPin, Globe, Info } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './StartupStackWeb.css';

export default function StartupStackWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const website = socialLinks?.website;

  return (
    <div className="startup-stack-container">
      <div className="startup-stack-wrapper">
        <div className="startup-stack-top-card" style={{flexDirection: 'column', alignItems: 'flex-start'}}>
          <div style={{display: 'flex', alignItems: 'center', width: '100%'}}>
            {profileImage ? (
              <img src={profileImage} alt={name} className="startup-stack-image" />
            ) : (
              <div className="startup-stack-placeholder">
                <span>{name?.charAt(0) || 'U'}</span>
              </div>
            )}
            <div className="startup-stack-top-text">
              <h1 className="startup-stack-name">{name}</h1>
              <div className="startup-stack-badge">
                <span className="startup-stack-role">{role}</span>
              </div>
            </div>
          </div>
          {companyName && (
             <div style={{marginTop: '16px', borderTop: '1px solid #E5E7EB', paddingTop: '16px', width: '100%'}}>
               <p style={{fontSize: '1rem', fontWeight: 'bold', color: '#111'}}>{companyName}</p>
               {category && <p style={{fontSize: '0.8rem', color: '#6B7280', textTransform: 'uppercase'}}>{category}</p>}
               {description && <p style={{fontSize: '0.85rem', color: '#4B5563', marginTop: '8px', lineHeight: '1.4'}}>{description}</p>}
             </div>
          )}
        </div>

        <div className="startup-stack-cards">
          <div className="startup-stack-info-block">
            <div className="startup-stack-icon-wrapper"><Phone size={18} color="#FFF" /></div>
            <div className="startup-stack-info-text">
              <span className="startup-stack-label">Phone</span>
              <span className="startup-stack-value">{phone}</span>
            </div>
          </div>

          <div className="startup-stack-info-block">
            <div className="startup-stack-icon-wrapper"><Mail size={18} color="#FFF" /></div>
            <div className="startup-stack-info-text">
              <span className="startup-stack-label">Email</span>
              <span className="startup-stack-value">{email}</span>
            </div>
          </div>

          {address && (
            <div className="startup-stack-info-block">
              <div className="startup-stack-icon-wrapper"><MapPin size={18} color="#FFF" /></div>
              <div className="startup-stack-info-text">
                <span className="startup-stack-label">Address</span>
                <span className="startup-stack-value" style={{fontSize: '0.9rem'}}>{address}</span>
              </div>
            </div>
          )}

          {website && (
            <div className="startup-stack-info-block">
              <div className="startup-stack-icon-wrapper"><Globe size={18} color="#FFF" /></div>
              <div className="startup-stack-info-text">
                <span className="startup-stack-label">Website</span>
                <span className="startup-stack-value">{website.replace(/^https?:\/\//, '')}</span>
              </div>
            </div>
          )}
          
          <div className="startup-stack-footer-wrap">
            <SharedCardFooter card={card} accentColor="#3B82F6" iconColor="#fff" />
          </div>
        </div>
      </div>
    </div>
  );
}
