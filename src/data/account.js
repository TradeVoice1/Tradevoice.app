// Account-level operations (currently just deletion).
import { authedFetch } from "../lib/authedFetch";

// Permanently delete the signed-in user's account + all their data.
// Cancels the platform subscription, purges storage, and deletes the auth
// user (which cascades every owned row). Irreversible. Throws on failure.
export async function deleteAccount() {
  const resp = await authedFetch('/api/account/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: 'DELETE' }),
  });
  if (!resp.ok) {
    let detail = '';
    try { detail = (await resp.json())?.error || ''; } catch { /* ignore */ }
    throw new Error(detail || `Delete failed (${resp.status})`);
  }
  return true;
}
