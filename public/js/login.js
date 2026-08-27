const form = document.getElementById('form');
const msg = document.getElementById('msg');

form.addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        password: password.value
      })
    });

    const d = await r.json();
    if (!r.ok) throw new Error(d.error);

    localStorage.setItem('reflex_token', d.token);
    localStorage.setItem('reflex_user', JSON.stringify(d.user));

    const redirects = {
      RETAILER: '/retailer.html',
      DISPATCHER: '/dispatcher.html',
      RIDER: '/rider.html'
    };
    location.href = redirects[d.user.role] || '/';
  } catch (err) {
    msg.innerHTML = `<div class="notice error">${err.message}</div>`;
  }
});