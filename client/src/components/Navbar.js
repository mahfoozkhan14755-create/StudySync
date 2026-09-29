import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={{ background: '#1e293b', padding: '12px 24px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link to={user ? "/dashboard" : "/"} style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '20px', fontWeight: 'bold' }}>
        StudySync
      </Link>
      <div>
        {user ? (
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <span>Welcome, <b>{user.name}</b></span>
            <button onClick={handleLogout} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>
              Logout
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '10px' }}>
            <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Login</Link>
            <Link to="/register" style={{ color: '#fff', textDecoration: 'none' }}>Register</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;