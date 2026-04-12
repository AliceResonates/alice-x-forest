// Local shim for @base44/sdk to allow development without the real package.
// Exports a `createClient` function that returns a lightweight mock client
// with `functions.invoke`, simple `db` helpers and `auth` stubs.
export function createClient(options = {}) {
  const { appId, token } = options;

  const client = {
    options,
    functions: {
      async invoke(name, payload) {
        // Basic mock behavior: echo the call back with a generated id
        return {
          invoked: name,
          payload,
          result: {
            id: `fn_${name}_${Date.now()}`,
            ok: true
          }
        };
      }
    },
    db: {
      async get(collection, id) {
        return null;
      },
      async list(collection, query) {
        return [];
      },
      async create(collection, doc) {
        return { id: `doc_${Date.now()}`, ...doc };
      },
      async update(collection, id, patch) {
        return { id, ...patch };
      },
      async delete(collection, id) {
        return { id };
      }
    },
    auth: {
      currentUser: null,
      async login(creds) {
        this.currentUser = { email: creds?.email || 'dev@local', token: token || 'local-token' };
        return this.currentUser;
      },
      async logout() {
        this.currentUser = null;
      }
    }
  };

  return client;
}

export default { createClient };
