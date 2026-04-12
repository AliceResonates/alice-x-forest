import { useState, useEffect } from 'react';
import { fetchRoomMessages, sendMessage } from '../api/chat';

export function useChat(roomId) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchRoomMessages(roomId).then((m) => {
      if (mounted) setMessages(m);
    });
    return () => {
      mounted = false;
    };
  }, [roomId]);

  async function postMessage(message) {
    const saved = await sendMessage(message);
    setMessages((s) => [...s, saved]);
    return saved;
  }

  return { messages, postMessage };
}
