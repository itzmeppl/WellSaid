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

  if (loading) return <p>Loading...</p>;
  if (!offers.length) {
    return (
      <div>
        <h2>No Offers Available</h2>
        <p>Please check back later.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Offers</h2>
      <ul>
        {offers.map((offer) => (
          <li key={offer.id}>
            <h3>{offer.title}</h3>
            <p>{offer.description}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Offers;
