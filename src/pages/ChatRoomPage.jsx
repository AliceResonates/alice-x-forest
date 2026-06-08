import React, { useState } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from '../components/ChatMessage';

export default function ChatRoomPage({ roomId }) {
  const { messages, postMessage } = useChat(roomId, roomId);
  const [text, setText] = useState('');

  async function handleSend() {
    if (!text.trim()) return;
    const t = text;
    setText('');
    await postMessage(t);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border rounded-xl px-3 py-2 text-sm"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Schreib Alice…"
        />
        <button
          className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm disabled:opacity-50"
          onClick={handleSend}
          disabled={!text.trim()}
        >
          Senden
        </button>
      </div>
    </div>
  );
}
