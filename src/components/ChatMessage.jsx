import React from 'react';

export default function ChatMessage({ message }) {
  const { sender_name, content, sender_avatar, font_color } = message;
  return (
    <div className="flex items-start space-x-3 p-2">
      <img src={sender_avatar} alt={sender_name} className="w-8 h-8 rounded-full" />
      <div>
        <div className="text-sm font-semibold">{sender_name}</div>
        <div className="text-sm" style={{ color: font_color || '#000' }}>{content}</div>
      </div>
    </div>
  );
}
