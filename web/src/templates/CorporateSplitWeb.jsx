import React from 'react';
import { Phone, Mail, Globe, MapPin, Info, IndianRupee } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './CorporateSplitWeb.css';

export default function CorporateSplitWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, payment, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const upiId = payment?.upiId;

  return (
    <div className="corporate-split-container">
      <div className="corporate-split-card">
        <div className="corporate-split-left">
          {profileImage ? (
            <img src={profileImage} alt={name} className="corporate-split-image" />
          ) : (
            <div className="corporate-split-placeholder">🏢</div>
          )}
        </div>
        <div className="corporate-split-right">
          <div className="corporate-split-text-wrap">
            <h1 className="corporate-split-name">{name}</h1>
            <p className="corporate-split-role">{role}</p>
            {companyName && <p className="corporate-split-company">{companyName}</p>}
            {category && <p className="corporate-split-category">{category}</p>}
          </div>

          <div className="corporate-split-bottom-data">
            <div className="corporate-split-row">
              <div className="corporate-split-icon-box"><Phone size={12} color="#FFF" /></div>
              <span className="corporate-split-contact-text">{phone}</span>
            </div>
            <div className="corporate-split-row">
              <div className="corporate-split-icon-box"><Mail size={12} color="#FFF" /></div>
              <span className="corporate-split-contact-text">{email}</span>
            </div>
            {upiId && (
              <div className="corporate-split-row">
                <div className="corporate-split-icon-box"><IndianRupee size={12} color="#FFF" /></div>
                <span className="corporate-split-contact-text">{upiId}</span>
              </div>
            )}
            {address && (
              <div className="corporate-split-row">
                <div className="corporate-split-icon-box"><MapPin size={12} color="#FFF" /></div>
                <span className="corporate-split-contact-text">{address}</span>
              </div>
            )}
            {description && (
              <div className="corporate-split-row">
                <div className="corporate-split-icon-box"><Info size={12} color="#FFF" /></div>
                <span className="corporate-split-contact-text">{description}</span>
              </div>
            )}
          </div>
          
          <SharedCardFooter card={card} accentColor="#4F46E5" iconColor="#fff" />
        </div>
      </div>
    </div>
  );
}
