// src/api/base44Client.js
// Drop-in-Ersatz für den Base44-Mock: identische Schnittstelle,
// aber echte Persistenz über Supabase. Kein Konsument muss geändert werden.
import { supabase } from '../lib/supabase';

// Entity-Name (PascalCase im Code) -> Tabellenname (snake_case in Supabase)
const TABLE_MAP = {
  Profile: 'profiles',
  Post: 'posts',
  Comment: 'comments',
  ChatRoom: 'chat_rooms',
  Team: 'teams',
  TeamMoment: 'team_moments',
};

function tableFor(name) {
  const t = TABLE_MAP[name];
  if (!t) throw new Error(`Unbekannte Entity "${name}" – bitte in TABLE_MAP eintragen.`);
  return t;
}

// Sortier-Syntax des alten Clients: "-created_date" = absteigend
function applySort(query, sort) {
  if (!sort) return query;
  const column = sort.replace(/^-/, '');
  return query.order(column, { ascending: !sort.startsWith('-') });
}

function entityApi(name) {
  return {
    async filter(where = {}, sort = '-created_date', limit = 100) {
      let q = supabase.from(tableFor(name)).select('*').limit(limit);
      for (const [k, v] of Object.entries(where)) {
        if (v !== undefined && v !== null) q = q.eq(k, v);
      }
      const { data, error } = await applySort(q, sort);
      if (error) throw error;
      return data ?? [];
    },

    async list(sort = '-created_date', limit = 100) {
      return this.filter({}, sort, limit);
    },

    async get(id) {
      const { data, error } = await supabase
        .from(tableFor(name)).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      return data;
    },

    async create(doc) {
      const { data, error } = await supabase
        .from(tableFor(name)).insert(doc).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, patch) {
      const { data, error } = await supabase
        .from(tableFor(name)).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(tableFor(name)).delete().eq('id', id);
      if (error) throw error;
      return { id };
    },
  };
}

export const base44 = {
  entities: new Proxy({}, {
    get(_, entityName) {
      const name = String(entityName);
      // AuthContext fragt einmalig App-Settings ab – gibt es bei uns nicht,
      // der Aufrufer fängt null bereits sauber ab.
      if (name === 'App') return { async get() { return null; } };
      return entityApi(name);
    },
  }),

  auth: {
    // Gibt { id, email } zurück oder null – ProfilePage hängt an user.email.
    async me() {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data?.user) return null;
      return { id: data.user.id, email: data.user.email };
    },

    // Magic-Link-Login: Supabase schickt eine E-Mail, Klick loggt ein.
    async login(email) {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      return { sent: true };
    },

    async logout() {
      await supabase.auth.signOut();
    },

    onChange(callback) {
      return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session?.user ? { id: session.user.id, email: session.user.email } : null);
      });
    },
  },

  integrations: {
    Core: {
      // Avatare & Cover -> Supabase Storage (Bucket "uploads", public)
      async UploadFile({ file }) {
        const ext = file.name.split('.').pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('uploads').upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from('uploads').getPublicUrl(path);
        return { file_url: data.publicUrl };
      },

      // Bewusst noch nicht verdrahtet: LLM-Aufrufe gehören in dein Go-Backend
      // (EPI / submit_intent), nicht ungeschützt in den Browser.
      async InvokeLLM() {
        throw new Error('InvokeLLM läuft später über das EPI-Backend – nicht clientseitig.');
      },
    },
  },
};

export default base44;
