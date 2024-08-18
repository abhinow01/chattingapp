import React from "react";

function ChatList({ chats, onSelectChat, currentUser }) {
  return (
    <div className="overflow-y-auto h-full">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className="flex items-center p-4 hover:bg-gray-100 cursor-pointer"
          onClick={() => onSelectChat(chat)}
        >
          <img
            src={`https://ui-avatars.com/api/?name=${chat.username}`}
            alt={chat.username}
            className="w-10 h-10 rounded-full mr-3"
          />
          <div className="flex-1">
            <h3 className="font-semibold">{chat.username}</h3>
            <p className="text-sm text-gray-600">
              {chat.online ? 'Online' : 'Offline'}
            </p>
          </div>
          {chat.unreadCount > 0 && (
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {chat.unreadCount}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default ChatList;