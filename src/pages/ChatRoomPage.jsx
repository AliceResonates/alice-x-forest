import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../hooks/useChat';
import ChatMessage from '../components/ChatMessage';
import DignityPulse from '../components/forest/DignityPulse';
import EchoLayer from '../components/forest/EchoLayer';

export default function ChatRoomPage({ roomId }) {
  const { messages, postMessage, latestScores } = useChat(roomId, roomId);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // Automatisch zum letzten Nachricht scrollen
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setSending(true);
    try {
      await postMessage(trimmed);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="relative flex flex-col h-full min-h-0 rounded-2xl overflow-hidden border border-border/40 bg-card">

      {/* Ambienter Waldhintergrund */}
      <EchoLayer />

      {/* Dignity-Aura — oben rechts, reagiert auf Scores */}
      <DignityPulse
        dignityScore={latestScores?.dignityScore}
        emotionalResonance={latestScores?.emotionalResonance}
      />

      {/* Nachrichtenliste */}
      <div className="relative flex-1 overflow-y-auto px-2 py-4 space-y-1 z-10">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground mt-12 italic">
            Der Wald wartet. Sag etwas.
          </p>
        )}
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Eingabezeile */}
      <div className="relative z-10 flex gap-2 px-3 py-3 border-t border-border/30 bg-background/60 backdrop-blur-sm">
        <textarea
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border/60 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/40 transition"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Schreib Alice…"
          disabled={sending}
        />
        <button
          className="px-4 py-2 rounded-xl text-sm font-medium bg-primary/80 text-primary-foreground hover:bg-primary transition disabled:opacity-40"
          onClick={handleSend}
          disabled={!text.trim() || sending}
          aria-label="Nachricht senden"
        >
          {sending ? '…' : '↑'}
        </button>
      </div>
    </div>
  );
}
