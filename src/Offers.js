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

  return (
    <div>
      <h2>Offers</h2>
      <ul>
        {offers.map((offer) => (
          <li key={offer._id}>
            <img src={offer.clinic_logo} alt={offer.clinic_name} /> 
            <p>{offer.doctor_type}</p>
            <h3>{offer.clinic_name}</h3>
            <p>{offer.location}</p>
            <p>{offer.offer}</p>
            <p>{offer.offer_description}</p>
            
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Offers;