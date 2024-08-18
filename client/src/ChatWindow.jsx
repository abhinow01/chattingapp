import React, { useState, useEffect, useRef } from 'react';
import { FiSend } from "react-icons/fi";
import { ImAttachment } from "react-icons/im";
function ChatWindow({ selectedChat, onSendMessage, messages, typing, currentUser, onTyping }) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [file, setFile] = useState(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };
  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async () => {
    if (message.trim() !== '' || file) {
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        try {
          const response = await fetch('http://localhost:3000/api/upload', {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          onSendMessage(data.url, 'file');
          setFile(null);
        } catch (error) {
          console.error('Error uploading file:', error);
        }
      }
      if (message.trim() !== '') {
        onSendMessage(message, 'text');
        setMessage('');
      }
    }
  };

  const handleInputChange = (e) => {
    setMessage(e.target.value);
    onTyping();
  }

  if (!selectedChat) {
    return <div className="h-full flex items-center justify-center text-gray-500">Select a chat to start messaging</div>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b flex items-center">
        <img
          src={`https://ui-avatars.com/api/?name=${selectedChat.username}`}
          alt={selectedChat.username}
          className="w-10 h-10 rounded-full mr-3"
        />
        <h2 className="font-semibold">{selectedChat.username}</h2>
        {selectedChat.online && <span className="ml-2 text-sm text-green-500">Online</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, index) => (
          <div key={index} className={`mb-2 ${msg.senderId === currentUser.id ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block px-4 py-2 rounded-lg ${msg.senderId === currentUser.id ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}>
              {msg.content}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        {typing && <div className="text-sm text-gray-500">Typing...</div>}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t">
        <div className="flex items-center">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type your message here"
            className="flex-1 p-2 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' ? handleSendMessage() : null}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*"
          />
          <button 
            onClick={() => fileInputRef.current.click()}
            className="bg-gray-200 text-gray-700 px-4 py-2 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            <ImAttachment />
          </button>
          <button 
            onClick={handleSendMessage}
            className="bg-orange-500 text-white px-4 py-2 rounded-r-lg hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <FiSend />
          </button>
        </div>
        {file && <div className="mt-2 text-sm text-gray-600">File selected: {file.name}</div>}
      </div>
      </div>
    
  )    
}

export default ChatWindow;