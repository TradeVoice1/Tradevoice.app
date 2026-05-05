// Clients data layer. RLS in Supabase already restricts rows to the signed-in user,
// so we don't need to filter by owner_id ourselves on read — Supabase does it.

import { supabase } from "../supabase";

const dbToClient = (r) => ({
  id:      r.id,
  name:    r.name    ?? '',
  company: r.company ?? '',
  email:   r.email   ?? '',
  phone:   r.phone   ?? '',
  address: r.address ?? '',
});

const clientToDb = (c) => ({
  name:    c.name?.trim()    || null,
  company: c.company?.trim() || null,
  email:   c.email?.trim()   || null,
  phone:   c.phone?.trim()   || null,
  address: c.address?.trim() || null,
});

export async function listClients() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(dbToClient);
}

export async function addClient(ownerId, client) {
  const { data, error } = await supabase
    .from('clients')
    .insert({ owner_id: ownerId, ...clientToDb(client) })
    .select()
    .single();
  if (error) throw error;
  return dbToClient(data);
}

export async function updateClient(id, patch) {
  const { data, error } = await supabase
    .from('clients')
    .update(clientToDb(patch))
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return dbToClient(data);
}

export async function deleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id);
  if (error) throw error;
}
