/**
 * The gate.
 *
 * Deliberately tiny and separate from the room runtime: a person standing
 * outside the room should not be downloading the machinery of the inside of it.
 *
 * The inputs are reached by id, never as `form.name` — a <form> has its own
 * `name` property, so `form.name` hands back the form's name attribute (a
 * string) instead of the field, and every line after it throws.
 */
(function () {
  const form = document.getElementById('gate-form');
  const nameEl = document.getElementById('g-name');
  const keyEl = document.getElementById('g-key');
  const err = document.getElementById('gate-err');
  const card = document.querySelector('.gate-card');
  if (!form || !nameEl || !keyEl) return;

  const fail = (msg) => {
    err.textContent = msg;
    err.hidden = false;
    card.classList.remove('shake');
    void card.offsetWidth;
    card.classList.add('shake');
  };

  try {
    nameEl.focus();
  } catch {
    /* focus is a nicety, never a requirement */
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    err.hidden = true;

    try {
      const res = await fetch('/docs/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: nameEl.value.trim(), key: keyEl.value.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.ok) {
        // The cookie is already set; reloading now lands inside the room.
        location.reload();
        return;
      }

      fail(
        data.reason === 'no-name'
          ? 'The room needs a name to attribute your notes to.'
          : 'That name and key do not open the room together.',
      );
      keyEl.select();
    } catch {
      fail('The room could not be reached. Try again in a moment.');
    } finally {
      btn.disabled = false;
    }
  });
})();
