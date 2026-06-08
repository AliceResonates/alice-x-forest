import { useState, useEffect } from 'react';
import { fetchRoomMessages, sendMessage } from '../api/chat';
import { supabase } from '../lib/supabase'; // Dein Supabase Client

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
const DEFAULT_AGENT = 'gemma';

export function useChat(roomId, sessionId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let mounted = true;
    
    // 1. Normale Nachrichten laden
    fetchRoomMessages(roomId).then((m) => {
      if (mounted) setMessages(m);
    });

    // 2. Gatekeeper-Listener für System-Hygiene-Flags
    const subscription = supabase
      .channel('system-flags')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_hygiene_flags',
          filter: `session_id=eq.${roomId}`,
        },
        (payload) => {
          console.log('🚨 Gatekeeper Alarm empfangen:', payload.new);
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(subscription);
    };
  }, [roomId]);

  async function postMessage(userText) {
    const userMsg = await sendMessage({
      room_id: roomId,
      content: userText,
      sender_name: 'Du',
      sender_avatar: '',
      font_color: '#a8e6a3',
    });
    setMessages((s) => [...s, userMsg]);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId ?? roomId,
          agent_id: DEFAULT_AGENT,
          message: userText,
        }),
      });

      if (res.ok) {
        const { model, content } = await res.json();
        const aiMsg = await sendMessage({
          room_id: roomId,
          content,
          sender_name: `Alice (${model})`,
          sender_avatar: '',
          font_color: '#c9b8f0',
        });
        setMessages((s) => [...s, aiMsg]);
      }
    } catch {
      // Fail-soft: KI-Fehler bleibt unsichtbar im UI
    }

    return userMsg;
  }

  return { messages, postMessage };
}
