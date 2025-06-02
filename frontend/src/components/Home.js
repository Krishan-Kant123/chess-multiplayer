
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";
import toast from 'react-hot-toast';


function generateRoomId(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const Home = () => {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [generatedRoomId, setGeneratedRoomId] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (roomId.trim() && username.trim()) {
      localStorage.setItem("username", username.trim());
      navigate(`/room/${roomId.trim()}`);
    } else {
      toast.error('Please enter both username and room ID');

    }
  };

  const handleCreateRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    setGeneratedRoomId(newRoomId);
    toast.success(`Room created! Share this Room ID: ${newRoomId}`);

  };

  const handleCopyRoomId = () => {
    if (generatedRoomId) {
      navigator.clipboard.writeText(generatedRoomId).then(() => {
        toast.success('Room ID copied to clipboard!')
      }).catch(() => {
        
        const textArea = document.createElement('textarea');
        textArea.value = generatedRoomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        toast.success('Room ID copied to clipboard!')
      });
    }
  };

  return (
    <div className="home-container">
      <div className="home-card">
        <h1 className="home-title">Real-Time Chess Game</h1>
        
        <div className="home-form">
          <input
            type="text"
            placeholder="Enter Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="home-input"
          />
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            className="home-input room-id-input"
          />

          <div className="generated-room-section">
            <div className="generated-room-display">
              <span className="generated-room-id">
                {generatedRoomId || '------'}
              </span>
              <button
                onClick={handleCopyRoomId}
                className={`copy-button ${!generatedRoomId ? 'disabled' : ''}`}
                disabled={!generatedRoomId}
              >
                Copy
              </button>
            </div>
          </div>

          <div className="button-group">
            <button onClick={handleJoin} className="home-button join-button">
              Join Room
            </button>
            <button onClick={handleCreateRoom} className="home-button create-button">
              Create Room
            </button>
          </div>
        </div>

        <p className="home-info">
          Join an existing room with a Room ID or create a new room to play with friends.
        </p>
      </div>
    </div>
  );
};

export default Home;