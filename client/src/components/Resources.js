import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Resources = ({ groupId, userId }) => {
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        'x-auth-token': token,
        'Authorization': `Bearer ${token}`
      }
    };
  };

  const fetchResources = async () => {
    if (!groupId) return;
    try {
      const res = await axios.get(
        `http://localhost:5000/api/resources/${groupId}`,
        getAuthHeaders()
      );
      setFiles(res.data);
    } catch (err) {
      console.error('Fetch resources error:', err);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [groupId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return;

    const formData = new FormData();
    formData.append('title', title);
    formData.append('file', file);
    formData.append('groupId', groupId);
    formData.append('userId', userId);

    try {
      setStatusMsg('Uploading...');
      const token = localStorage.getItem('token');
      
      await axios.post('http://localhost:5000/api/resources/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-auth-token': token,
          'Authorization': `Bearer ${token}`
        }
      });

      setTitle('');
      setFile(null);
      setStatusMsg('Upload successful!');
      fetchResources();
      setTimeout(() => setStatusMsg(''), 3000);
    } catch (err) {
      console.error('Upload failed:', err);
      setStatusMsg('Upload failed. Check backend logs.');
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-4 border">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Study Resources & Notes</h3>
      
      {statusMsg && (
        <p className="text-sm mb-3 font-semibold text-blue-600">{statusMsg}</p>
      )}

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="flex flex-col gap-3 mb-6">
        <input 
          type="text" 
          placeholder="Resource Title (e.g., Chapter 1 Notes)" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full text-sm outline-none focus:border-blue-500"
          required
        />
        <input 
          type="file" 
          onChange={(e) => setFile(e.target.files[0])}
          className="border p-1 rounded w-full text-sm"
          required
        />
        <button type="submit" className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition text-sm font-semibold">
          Upload Document
        </button>
      </form>

      {/* File List */}
      <div className="space-y-2">
        {files.map((item) => (
          <div key={item._id} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
            <div>
              <p className="font-semibold text-gray-700 text-sm">{item.title}</p>
              <p className="text-xs text-gray-500">Uploaded by: {item.uploadedBy?.name || 'User'}</p>
            </div>
            <a 
              href={`http://localhost:5000${item.fileUrl}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-green-600 text-white text-xs px-3 py-1.5 rounded hover:bg-green-700 font-medium"
            >
              View / Download
            </a>
          </div>
        ))}
        {files.length === 0 && <p className="text-gray-500 text-sm">No resources uploaded yet.</p>}
      </div>
    </div>
  );
};

export default Resources;