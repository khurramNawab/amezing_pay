import React, { useEffect, useState, Suspense } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { getTemplateComponent } from '../templates/templateRegistry';
import { QRCodeSVG } from 'qrcode.react';
import './CardViewerPage.css';

const API_URL = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:4050`;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card-viewer-container flex-center">
          <div className="glass-panel error-panel">
            <h2>Rendering Error</h2>
            <p>Something went wrong displaying the template.</p>
            <p style={{fontSize: '0.8rem', color: '#666', marginTop: '10px'}}>{this.state.errorMsg}</p>
          </div>
        </div>
      );
    }
    return this.props.children;
}
}

const CardViewerPage = () => {
  const { id } = useParams();
  const [card, setCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        console.log(`Fetching card from: ${API_URL}/api/cards/${id}`);
        const response = await axios.get(`${API_URL}/api/cards/${id}`);
        console.log("Card data:", response.data);
        setCard(response.data);
      } catch (err) {
        console.error("Error fetching card:", err);
        setError(`Failed to load card. ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchCard();
  }, [id]);

  if (loading) {
    return <div className="card-viewer-container flex-center"><div className="loader"></div></div>;
  }

  if (error || !card) {
    return (
      <div className="card-viewer-container flex-center">
        <div className="glass-panel error-panel">
          <h2>Oops!</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // Dynamically resolve the correct template component based on card.template
  const TemplateComponent = getTemplateComponent(card.template);
  
  // Show top right QR overlay if payment info exists (matching mobile VisitingCard.js logic)
  const payment = card.payment || {};
  const showQrOverlay = !!(payment.qrImageUrl || payment.upiId);

  return (
    <ErrorBoundary>
      <Suspense fallback={<div className="card-viewer-container flex-center"><div className="loader"></div></div>}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '100%', margin: '0 auto' }}>
          <TemplateComponent card={card} />
          
          {showQrOverlay && (
            <div style={{
              position: 'absolute',
              right: '20px',
              top: '20px',
              padding: '6px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.95)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 50,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {payment.qrImageUrl ? (
                <img src={payment.qrImageUrl} alt="QR" style={{ width: '46px', height: '46px', borderRadius: '4px', objectFit: 'contain' }} />
              ) : (
                <QRCodeSVG value={`upi://pay?pa=${payment.upiId}&pn=${card.name}`} size={46} />
              )}
            </div>
          )}
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

export default CardViewerPage;
