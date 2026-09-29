import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const Quiz = ({ groupId }) => {
  const { token } = useContext(AuthContext);
  const [quizzes, setQuizzes] = useState([]);
  const [title, setTitle] = useState('');

  const authHeader = { headers: { 'x-auth-token': token } };

  useEffect(() => {
    if (groupId) {
      axios.get(`${API_BASE_URL}/api/quizzes/${groupId}`, authHeader)
        .then(res => setQuizzes(res.data))
        .catch(err => console.error(err));
    }
  }, [groupId]);

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    try {
      const newQuiz = {
        groupId,
        title,
        questions: [{ questionText: 'Sample Question?', options: ['A', 'B', 'C', 'D'], correctAnswer: 0 }]
      };
      await axios.post(`${API_BASE_URL}/api/quizzes/create`, newQuiz, authHeader);
      setTitle('');
      // Reload quizzes
      const res = await axios.get(`${API_BASE_URL}/api/quizzes/${groupId}`, authHeader);
      setQuizzes(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
      <h3>Group Quizzes</h3>
      <form onSubmit={handleCreateQuiz} style={{ marginBottom: '15px' }}>
        <input 
          type="text" 
          placeholder="Quiz Title" 
          value={title} 
          onChange={(e) => setTitle(e.target.value)} 
          required 
          style={{ padding: '6px', marginRight: '10px' }} 
        />
        <button type="submit" style={{ padding: '6px 12px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px' }}>
          Create Quick Quiz
        </button>
      </form>
      <ul>
        {quizzes.map((q) => (
          <li key={q._id}><b>{q.title}</b> ({q.questions.length} Questions)</li>
        ))}
      </ul>
    </div>
  );
};

export default Quiz;