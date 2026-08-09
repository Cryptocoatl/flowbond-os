/**
 * The gate.
 *
 * Deliberately tiny and separate from the room runtime: a person standing
 * outside the room should not be downloading the machinery of the inside of it.
 */
(function () {
  const form = document.getElementById('gate-form');
  const err = document.getElementById('gate-err');
  const card = document.querySelector('.gate-card');
  if (!form) return;

  form.name.focus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    err.hidden = true;

    try {
      const res = await fetch('/docs/auth', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name.value.trim(),
          key: form.key.value.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (data.ok) {
        // The cookie is already set; reloading now lands inside the room.
        location.reload();
        return;
      }

      err.textContent =
        data.reason === 'no-name'
          ? 'The room needs a name to attribute your notes to.'
          : 'That name and key do not open the room together.';
      err.hidden = false;
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
      form.key.select();
    } catch {
      err.textContent = 'The room could not be reached. Try again in a moment.';
      err.hidden = false;
    } finally {
      btn.disabled = false;
    }
  });
})();
