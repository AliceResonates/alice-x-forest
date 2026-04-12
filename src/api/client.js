// Use local shim when @base44/sdk is not available in dev
import { createClient } from '../lib/base44';
import { appParams } from '../lib/app-params';

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create a client (local shim)
export const client = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: appBaseUrl || '',
  requiresAuth: false,
  appBaseUrl
});
