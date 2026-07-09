'use client';

import { useState } from 'react';
import { useGame } from '@/components/providers/GameProvider';

export function SponsorCTA() {
  const { toast } = useGame();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ name: '', org: '', email: '', message: '' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast('Te contactamos para adoptar un nodo 🤝', 'gold');
      setOpen(false);
      setForm({ name: '', org: '', email: '', message: '' });
    } catch {
      toast('No se pudo enviar. Intenta de nuevo.', 'jade');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sponsor">
      <h3>Adopta un nodo</h3>
      <p>
        Marcas, alcaldías y huertos: patrocinen un baño y reciban reporte mensual de agua salvada,
        tierra creada y alcance comunitario. El piloto vive en Huerto Roma Verde.
      </p>

      {!open ? (
        <button onClick={() => setOpen(true)}>Quiero patrocinar</button>
      ) : (
        <form onSubmit={submit} style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left' }}>
          <input
            className="field"
            required
            placeholder="Tu nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            aria-label="Nombre"
          />
          <input
            className="field"
            placeholder="Organización (opcional)"
            value={form.org}
            onChange={(e) => setForm({ ...form, org: e.target.value })}
            aria-label="Organización"
          />
          <input
            className="field"
            required
            type="email"
            placeholder="Correo"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            aria-label="Correo"
          />
          <textarea
            className="field"
            rows={3}
            placeholder="¿Qué nodo o colonia te interesa?"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            aria-label="Mensaje"
          />
          <button type="submit" disabled={busy} style={{ marginTop: 12, border: 'none' }}>
            {busy ? 'Enviando…' : 'Enviar interés'}
          </button>
        </form>
      )}
    </div>
  );
}
