import { useState, useEffect } from 'react';
import { fetchRoomMessages, sendMessage } from '../api/chat';
import { supabase } from '../lib/supabase'; // Dein Supabase Client

export function useChat(roomId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let mounted = true;
    
    // 1. Normale Nachrichten laden
    fetchRoomMessages(roomId).then((m) => {
      if (mounted) setMessages(m);
    });

    // 2. Dem Gatekeeper "zuhören" (Realtime Subscription)
    const subscription = supabase
      .channel('system-flags')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'system_hygiene_flags',
          filter: `session_id=eq.${roomId}` // Nur Flags für diesen Raum
        },
        (payload) => {
          console.log('🚨 Gatekeeper Alarm empfangen:', payload.new);
          // HIER reagiert das UI: z.B. Blur-Effekt über den Chat legen, 
          // eine Warnung rendern oder den User-Input sperren.
        }
      )
      .subscribe();

    // 3. Cleanup beim Verlassen des Raums
    return () => {
      mounted = false;
      supabase.removeChannel(subscription); // Sauber aufräumen, damit keine Memory Leaks entstehen
    };
  }, [roomId]);

  // 4. Nachrichten senden (Der Teil, der bleiben sollte)
  async function postMessage(message) {
    const saved = await sendMessage(message);
    setMessages((s) => [...s, saved]);
    return saved;
  }

  return { messages, postMessage };
}
