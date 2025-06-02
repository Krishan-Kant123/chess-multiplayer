
import React, { useState, useEffect, useRef } from "react";
import "./Chat.css";

const Chat = ({ socket, roomId, username }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message) => {
      setMessages((prev) => [...prev, message]);
    };

    socket.on("chatMessage", handleNewMessage);

    return () => {
      socket.off("chatMessage", handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = () => {
    if (input.trim() === "") return;
    socket.emit("chatMessage", { roomId, username, message: input.trim() });
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-container">
      <h3 className="chat-header">Chat</h3>
      <div className="blue-strip"></div>
      <div className="chat-messages">
        {messages.map((msg, idx) => {
          const isOwn = msg.username === username;
          return (
            <div key={idx} className={`chat-message ${isOwn ? "own" : "other"}`}>
              {!isOwn && <div className="chat-username">{msg.username}</div>}
              <div className="chat-bubble">{msg.message}</div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-container">
        <textarea
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="chat-input"
        />
        <button onClick={sendMessage} className="chat-send-button">
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
