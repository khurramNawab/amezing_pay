import React from 'react';
import { Phone, Mail, MapPin, Globe, Info, IndianRupee } from 'lucide-react';
import SharedCardFooter from '../components/SharedCardFooter';
import './ClassicHorizontalWeb.css';

export default function ClassicHorizontalWeb({ card }) {
  const { name, role, phone, email, profileImage, businessInfo, payment, socialLinks } = card;
  const companyName = businessInfo?.name;
  const category = businessInfo?.category;
  const address = businessInfo?.address;
  const description = businessInfo?.description;
  const upiId = payment?.upiId;
  const website = socialLinks?.website;

  return (
    <div className="classic-horizontal-container">
      <div className="classic-horizontal-card">
        <div className="classic-horizontal-header">
          <div className="classic-horizontal-header-left">
            <h1 className="classic-horizontal-name">{name}</h1>
            <p className="classic-horizontal-role">{role}</p>
            {companyName && <p className="classic-horizontal-company">{companyName}</p>}
            {category && <p className="classic-horizontal-category">{category}</p>}
          </div>
          {profileImage ? (
            <img src={profileImage} alt={name} className="classic-horizontal-image" />
          ) : (
            <div className="classic-horizontal-placeholder">👤</div>
          )}
        </div>

        <div className="classic-horizontal-dashed-line" />

        <div className="classic-horizontal-contact">
          <div className="classic-horizontal-row">
            <Phone size={16} color="#666" />
            <span>{phone}</span>
          </div>
          <div className="classic-horizontal-row">
            <Mail size={16} color="#666" />
            <span>{email}</span>
          </div>
          {upiId && (
            <div className="classic-horizontal-row">
              <IndianRupee size={16} color="#666" />
              <span>{upiId}</span>
            </div>
          )}
          {address && (
            <div className="classic-horizontal-row">
              <MapPin size={16} color="#666" />
              <span>{address}</span>
            </div>
          )}
          {website && (
            <div className="classic-horizontal-row">
              <Globe size={16} color="#666" />
              <span>{website.replace(/^https?:\/\//, '')}</span>
            </div>
          )}
          {description && (
            <div className="classic-horizontal-row classic-horizontal-desc">
              <Info size={16} color="#666" />
              <span>{description}</span>
            </div>
          )}
        </div>

        <SharedCardFooter card={card} accentColor="#333" iconColor="#fff" />
      </div>
    </div>
  );
}
