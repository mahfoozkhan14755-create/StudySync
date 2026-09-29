import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const TutorMarketplace = () => {
  const [tutors, setTutors] = useState([]);

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/tutors`)
      .then((res) => setTutors(res.data))
      .catch((err) => console.error('Error fetching tutors', err));
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>Tutor Marketplace</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' }}>
        {tutors.map((t) => (
          <div key={t._id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '15px', background: '#fff' }}>
            <h3>{t.userId?.name}</h3>
            <p><b>Subject:</b> {t.subject}</p>
            <p><b>Rate:</b> ${t.hourlyRate}/hr</p>
            <p>{t.bio}</p>
            <button style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              Book Session
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TutorMarketplace;