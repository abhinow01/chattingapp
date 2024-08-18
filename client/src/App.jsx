import React, { useState, useEffect } from 'react';
import ChatList from './Chatlist';
import ChatWindow from './ChatWindow';
import SearchBar from './SearchBar';
import { io } from 'socket.io-client';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [socket, setSocket] = useState(null);
  const [typing, setTyping] = useState({});

  useEffect(() => {
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server with ID:', newSocket.id);
      // Generate a random username for this example
      const username = `User${Math.floor(Math.random() * 1000)}`;
      newSocket.emit('login', username);
      setCurrentUser({ id: newSocket.id, username });
    });

    newSocket.on('user_list', (userList) => {
      setUsers(userList.filter(user => user.id !== newSocket.id));
    });

    newSocket.on('new_message', (message) => {
      setMessages(prevMessages => ({
        ...prevMessages,
        [message.senderId]: [...(prevMessages[message.senderId] || []), message]
      }));
    });

    newSocket.on('user_typing', ({ userId }) => {
      setTyping(prev => ({ ...prev, [userId]: true }));
      setTimeout(() => setTyping(prev => ({ ...prev, [userId]: false })), 3000);
    });

    newSocket.on('user_status', ({ userId, online }) => {
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, online } : user
        )
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleSendMessage = (content) => {
    if (socket && selectedChat) {
      const messageData = {
        recipientId: selectedChat.id,
        content,
        type: 'text'
      };
      socket.emit('send_message', messageData);
      // Add the sent message to the local state
      const sentMessage = {
        id: Date.now(),
        senderId: currentUser.id,
        recipientId: selectedChat.id,
        content,
        type: 'text',
        timestamp: new Date(),
        read: false
      };
      setMessages(prevMessages => ({
        ...prevMessages,
        [selectedChat.id]: [...(prevMessages[selectedChat.id] || []), sentMessage]
      }));
    }
  };

  const handleTyping = () => {
    if (socket && selectedChat) {
      socket.emit('typing', selectedChat.id);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-1/3 bg-white border-r">
        <SearchBar />
        <ChatList 
          chats={users} 
          onSelectChat={setSelectedChat} 
          currentUser={currentUser}
        />
      </div>
      <div className="w-2/3">
        <ChatWindow
          selectedChat={selectedChat}
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          messages={selectedChat ? messages[selectedChat.id] || [] : []}
          typing={selectedChat ? typing[selectedChat.id] : false}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}

export default App;