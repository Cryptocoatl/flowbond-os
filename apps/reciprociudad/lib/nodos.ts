'use client';

import { browserClient } from './supabase-browser';

/** A node on the living Reciprociudad network. */
export type Nodo = {
  id: string;
  name: string;
  kind: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  offers: string | null;
  needs: string | null;
  contact?: string | null;
};

export const NODE_KINDS: [string, string][] = [
  ['comunidad', 'Comunidad'],
  ['chinampa', 'Chinampa'],
  ['bano_seco', 'Baño seco'],
  ['huerto', 'Huerto'],
  ['negocio', 'Negocio'],
  ['tianguis', 'Tianguis'],
  ['cultura', 'Cultura'],
  ['causa', 'Causa'],
  ['otro', 'Otro'],
];
export const KIND_LABEL: Record<string, string> = Object.fromEntries(NODE_KINDS);

export async function publishedNodes(): Promise<Nodo[]> {
  const { data, error } = await browserClient().rpc('reciprociudad_nodes_published');
  if (error) throw error;
  return (data ?? []) as Nodo[];
}

export async function myNode(): Promise<Nodo | null> {
  const { data, error } = await browserClient().rpc('reciprociudad_my_node');
  if (error) throw error;
  const rows = (data ?? []) as Nodo[];
  return rows[0] ?? null;
}

export type NodeInput = {
  name: string;
  kind: string;
  description: string;
  offers: string;
  needs: string;
  contact: string;
  lat: number | null;
  lng: number | null;
};

export async function upsertNode(i: NodeInput): Promise<Nodo> {
  const { data, error } = await browserClient().rpc('reciprociudad_node_upsert', {
    p_name: i.name,
    p_kind: i.kind,
    p_description: i.description,
    p_lat: i.lat,
    p_lng: i.lng,
    p_offers: i.offers,
    p_needs: i.needs,
    p_contact: i.contact,
  });
  if (error) throw error;
  return (data as Nodo[])[0];
}
