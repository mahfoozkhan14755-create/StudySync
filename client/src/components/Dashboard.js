import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Dashboard = () => {
  const { user, token } = useContext(AuthContext);
  const [groups, setGroups] = useState([]);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const authHeader = {
    headers: {
      'x-auth-token': token,
      'Authorization': `Bearer ${token}`
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/groups/my-groups', authHeader);
      setGroups(res.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch groups');
    }
  };

  useEffect(() => {
    if (token) fetchGroups();
  }, [token]);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/groups/create', { name: groupName }, authHeader);
      setGroupName('');
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group');
    }
  };

  const handleJoinGroup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/groups/join', { code: groupCode }, authHeader);
      setGroupCode('');
      fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join group');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2>Welcome, {user?.name}!</h2>
      <p>Email: {user?.email}</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}

      <div style={{ display: 'flex', gap: '20px', margin: '20px 0' }}>
        <form onSubmit={handleCreateGroup} style={{ flex: 1, padding: '15px', border: '1px solid #ccc', borderRadius: '6px' }}>
          <h3>Create Study Group</h3>
          <input type="text" placeholder="Group Name (e.g., MERN Masters)" value={groupName} onChange={(e) => setGroupName(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px' }}>Create</button>
        </form>

        <form onSubmit={handleJoinGroup} style={{ flex: 1, padding: '15px', border: '1px solid #ccc', borderRadius: '6px' }}>
          <h3>Join via Code</h3>
          <input type="text" placeholder="Enter Group Code" value={groupCode} onChange={(e) => setGroupCode(e.target.value)} required style={{ width: '100%', padding: '8px', marginBottom: '10px' }} />
          <button type="submit" style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px' }}>Join</button>
        </form>
      </div>

      <h3>Your Study Groups</h3>
      {groups.length === 0 ? (
        <p>No study groups found. Create or join one above!</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
          {groups.map((g) => (
            <div key={g._id} style={{ padding: '15px', border: '1px solid #38bdf8', borderRadius: '6px', background: '#f0f9ff' }}>
              <h4 style={{ margin: '0 0 10px 0' }}>{g.name}</h4>
              <p style={{ margin: '4px 0', fontSize: '14px' }}>Code: <b>{g.code}</b></p>
              <button onClick={() => navigate(`/room/${g._id}`)} style={{ marginTop: '10px', padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                Enter Room
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;