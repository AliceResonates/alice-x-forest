import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from '../components/ChatMessage';

export default function ChatRoomPage({ roomId }) {
  const { messages, postMessage } = useChat(roomId);
  const [text, setText] = useState('');

  async function handleSend() {
    if (!text.trim()) return;
    await postMessage({ room_id: roomId, content: text, sender_name: 'You', sender_avatar: '', font_color: '#a8e6a3' });
    setText('');
  }

  return (
    <div className="p-4">
      <div className="space-y-2">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      <div className="mt-4 flex space-x-2">
        <input className="flex-1 border p-2" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="px-4 py-2 bg-green-500 text-white rounded" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
