import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import DignityPulse from '../components/forest/DignityPulse';
import EchoLayer from '../components/forest/EchoLayer';
import { ReasoningBox } from '../components/ReasoningBox';

export default function ChatRoomPage({ roomId }) {
  const { messages, postMessage, latestScores, parliamentThoughts } = useChat(roomId, roomId);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    const text = inputValue;
    setInputValue('');
    setIsSending(true);
    try {
      await postMessage(text);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="relative flex flex-col h-[85vh] w-full bg-[#050505] text-white border border-[#1f1f1f] rounded-2xl overflow-hidden font-mono shadow-2xl">

      {/* Ambienter Waldhintergrund + Dignity-Aura */}
      <EchoLayer />
      <DignityPulse
        dignityScore={latestScores?.dignityScore}
        emotionalResonance={latestScores?.emotionalResonance}
      />

      {/* Header */}
      <div className="relative z-10 px-6 py-4 border-b border-[#1f1f1f] bg-black/60 backdrop-blur-sm flex justify-between items-center">
        <h2 className="text-[#a8e6a3] tracking-widest uppercase text-xs font-bold">
          Alice × Forest
        </h2>
        <span className="text-[#404040] text-xs">Room: {roomId}</span>
      </div>

      {/* Chat-Verlauf */}
      <div className="relative z-10 flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-[#404040] text-sm uppercase tracking-widest">
            The forest is silent.
          </div>
        )}

        {messages.map((msg, idx) => {
          const isUser = msg.sender_name === 'You';
          return (
            <div key={msg.id || idx} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-gray-500 mb-1 uppercase tracking-wider pl-1">
                {msg.sender_name}
              </span>
              <div
                className={`px-4 py-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0f1a0f] border border-[#1a331a] rounded-tr-sm'
                    : 'bg-[#12101a] border border-[#221c35] rounded-tl-sm'
                }`}
                style={{ color: msg.font_color }}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {/* Taucht nur auf, wenn das Parlament tatsächlich geantwortet hat */}
        <ReasoningBox thoughts={parliamentThoughts} />
        <div ref={bottomRef} />
      </div>

      {/* Eingabefeld */}
      <div className="relative z-10 p-4 bg-black/80 backdrop-blur-md border-t border-[#1f1f1f]">
        <form onSubmit={handleSend} className="flex gap-3 items-end">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend(e);
              }
            }}
            placeholder="Speak into the forest..."
            disabled={isSending}
            rows={1}
            className="flex-1 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#a8e6a3] transition-colors disabled:opacity-50 resize-none min-h-[44px]"
          />
          <button
            type="submit"
            disabled={isSending || !inputValue.trim()}
            className="h-[44px] px-6 bg-[#121212] hover:bg-[#1a1a1a] text-[#a8e6a3] border border-[#2a2a2a] rounded-lg text-sm uppercase tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {isSending ? '...' : 'Send'}
          </button>
        </form>
      </div>

    </div>
  );
}
