// Offers.jsx (React component)
import React, { useEffect, useState } from 'react';

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/getOffers') // point to your backend
      .then((res) => res.json())
      .then((data) => {
        setOffers(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching offers:', err);
        setLoading(false);
      });
  }, []);

  console.log('Offers:', offers);
  
  if (loading) {
    return <div>Loading offers...</div>;
  }

  if (!offers.length) {
    return <div>No offers available at the moment.</div>;
  }

const styles = {
  card: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '16px',
    padding: '16px',
    border: '1px solid #ccc',
    borderRadius: '12px',
    marginBottom: '16px',
    backgroundColor: '#f9f9f9',
  },
  logo: {
    width: '100px',
    height: 'auto',
    objectFit: 'contain',
  },
  content: {
    flex: 1,
  },
};


return (
    <div>
      <h2>Offers</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {offers.map((offer) => (
          <li key={offer._id} style={styles.card}>
            <img
              src={offer.clinic_logo}
              alt={offer.clinic_name}
              style={styles.logo}
            />
            <div style={styles.content}>
              <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                {offer.offer}
              </p>
              <h3 style={{ margin: '4px 0' }}>{offer.clinic_name}</h3>
              <p style={{ margin: '2px 0' }}>{offer.doctor_type}</p>
              <p style={{ margin: '2px 0' }}>{offer.location}</p>
              <p style={{ marginTop: '6px' }}>{offer.offer_description}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Offers;