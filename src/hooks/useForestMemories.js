import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function useForestMemories(limit = 20) {
  const [memories, setMemories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/api/memory/forest?limit=${limit}`)
      .then(r => r.ok ? r.json() : { memories: [] })
      .then(({ memories: m }) => { if (mounted) setMemories(m ?? []); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [limit]);

  return { memories, loading };
}
