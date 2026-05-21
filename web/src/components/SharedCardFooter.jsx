import React from 'react';
import { MessageCircle, Camera, Briefcase, Globe, Link as LinkIcon, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import './SharedCardFooter.css';

const formatSocialUrl = (url, platform) => {
  if (!url) return '';
  const clean = url.trim();
  if (clean.startsWith('http')) return clean;
  const map = {
    instagram: `https://www.instagram.com/${clean.replace('@', '')}`,
    linkedin: `https://www.linkedin.com/in/${clean}`,
    whatsapp: `https://wa.me/${clean.replace(/[^0-9]/g, '')}`,
  };
  return map[platform] || `https://${clean}`;
};

export default function SharedCardFooter({ card, accentColor = '#4F46E5', iconColor = '#fff' }) {
  const { name, socialLinks, payment, products } = card;

  const hasSocials = socialLinks && Object.values(socialLinks).some(Boolean);
  const hasPayment = payment && (payment.qrImageUrl || payment.upiId);
  const hasProducts = products && products.length > 0;

  if (!hasSocials && !hasPayment && !hasProducts) return null;

  return (
    <div className="shared-footer-container" style={{ '--accent': accentColor, '--icon-color': iconColor }}>
      {/* Social Links */}
      {hasSocials && (
        <div className="shared-social-grid">
          {socialLinks.whatsapp && <a href={formatSocialUrl(socialLinks.whatsapp, 'whatsapp')} target="_blank" rel="noreferrer" className="shared-social-btn"><MessageCircle size={18} /></a>}
          {socialLinks.instagram && <a href={formatSocialUrl(socialLinks.instagram, 'instagram')} target="_blank" rel="noreferrer" className="shared-social-btn"><Camera size={18} /></a>}
          {socialLinks.linkedin && <a href={formatSocialUrl(socialLinks.linkedin, 'linkedin')} target="_blank" rel="noreferrer" className="shared-social-btn"><Briefcase size={18} /></a>}
          {socialLinks.website && <a href={formatSocialUrl(socialLinks.website, 'website')} target="_blank" rel="noreferrer" className="shared-social-btn"><Globe size={18} /></a>}
          {socialLinks.youtube && <a href={formatSocialUrl(socialLinks.youtube, 'youtube')} target="_blank" rel="noreferrer" className="shared-social-btn"><LinkIcon size={18} /></a>}
        </div>
      )}

      {/* Payment */}
      {hasPayment && (
        <div className="shared-payment-section">
          <h4 className="shared-section-title"><QrCode size={16} /> Scan to Pay</h4>
          <div className="shared-qr-container">
            {payment.qrImageUrl ? (
              <img src={payment.qrImageUrl} alt="QR" className="shared-qr-img" />
            ) : (
              <div className="shared-qr-wrap">
                <QRCodeSVG value={`upi://pay?pa=${payment.upiId}&pn=${name}`} size={120} />
              </div>
            )}
            {payment.upiId && <p className="shared-upi-id">{payment.upiId}</p>}
          </div>
        </div>
      )}

      {/* Products */}
      {hasProducts && (
        <div className="shared-products-section">
          <h4 className="shared-section-title">Our Services / Products</h4>
          <div className="shared-products-grid">
            {products.slice(0, 5).map((p, i) => (
              <div key={i} className="shared-product-item">
                <img src={p.imageUrl} alt={p.title || 'Product'} className="shared-product-img" />
                {p.title && <span className="shared-product-title">{p.title}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
