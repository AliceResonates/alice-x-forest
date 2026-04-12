import { client } from './client';

// Simple in-memory store keyed by roomId
const store = {};

export async function sendMessage(message) {
  const id = `msg_${Date.now()}`;
  const msg = { id, ...message, created_at: new Date().toISOString() };
  const room = message.room_id || 'room_demo';
  store[room] = store[room] || [];
  store[room].push(msg);

  // Optionally persist via client.db.create when available
  try {
    await client.db.create('chat_messages', msg);
  } catch (e) {
    // ignore if client.db is mock
  }

  return msg;
}

export async function fetchRoomMessages(roomId) {
  const room = roomId || 'room_demo';
  // Try to list from client.db first
  try {
    const remote = await client.db.list('chat_messages', { room_id: room });
    if (Array.isArray(remote) && remote.length > 0) return remote;
  } catch (e) {
    // ignore
  }

  return store[room] || [];
}
