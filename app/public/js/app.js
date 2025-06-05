// public/js/app.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm     = document.getElementById('loginForm');
    const registerForm  = document.getElementById('registerForm');
    const forgotForm    = document.getElementById('forgotForm');
    const resetForm     = document.getElementById('resetForm');
    const changeForm    = document.getElementById('changeForm');
    const token         = localStorage.getItem('token');
    const username      = localStorage.getItem('username');
  
    // Helper para mostrar alertas
    function showAlert(containerId, msg, type) {
      const c = document.getElementById(containerId);
      if (c) c.innerHTML = `<div class="alert alert-${type}" role="alert">${msg}</div>`;
    }
  
    // LOGOUT siempre disponible
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'index.html';
      });
    }
  
    // ----------------------------
    // LOGIN
    // ----------------------------
    if (loginForm) {
      loginForm.addEventListener('submit', async e => {
        e.preventDefault();
        const u = document.getElementById('username').value;
        const p = document.getElementById('password').value;
  
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, password: p })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
  
          localStorage.setItem('token', data.token);
          localStorage.setItem('username', u);
          window.location.href = 'dashboard.html';
        } catch (err) {
          showAlert('loginAlert', err.message, 'danger');
        }
      });
    }
  
    // ----------------------------
    // REGISTRO
    // ----------------------------
    if (registerForm) {
      registerForm.addEventListener('submit', async e => {
        e.preventDefault();
        const u = document.getElementById('regUser').value;
        const em = document.getElementById('regEmail').value;
        const p = document.getElementById('regPass').value;
  
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u, email: em, password: p })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showAlert('registerAlert', data.message, 'success');
        } catch (err) {
          showAlert('registerAlert', err.message, 'danger');
        }
      });
    }
  
    // ----------------------------
    // OLVIDÉ MI CONTRASEÑA
    // ----------------------------
    if (forgotForm) {
      forgotForm.addEventListener('submit', async e => {
        e.preventDefault();
        const u = document.getElementById('forgotUser').value;
  
        try {
          const res = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: u })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showAlert('forgotAlert', data.message, 'info');
          const div = document.getElementById('resetLink');
          if (div) {
            div.innerHTML = `
              <p>Usa este token para <a href="reset.html">restablecer tu contraseña</a>:</p>
              <code>${data.token}</code>
            `;
          }
        } catch (err) {
          showAlert('forgotAlert', err.message, 'danger');
        }
      });
    }
  
    // ----------------------------
    // RESTABLECER CONTRASEÑA
    // ----------------------------
    if (resetForm) {
      resetForm.addEventListener('submit', async e => {
        e.preventDefault();
        const t = document.getElementById('resetToken').value;
        const p = document.getElementById('resetPass').value;
  
        try {
          const res = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: t, newPassword: p })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showAlert('resetAlert', data.message, 'success');
        } catch (err) {
          showAlert('resetAlert', err.message, 'danger');
        }
      });
    }
  
    // ----------------------------
    // CAMBIO DE CONTRASEÑA (Dashboard)
    // ----------------------------
    if (changeForm) {
      if (!token) {
        window.location.href = 'index.html';
        return;
      }
      changeForm.addEventListener('submit', async e => {
        e.preventDefault();
        const cur = document.getElementById('currentPassword').value;
        const neu = document.getElementById('newPassword').value;
  
        try {
          const res = await fetch('/api/auth/change-password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, currentPassword: cur, newPassword: neu })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          showAlert('changeAlert', data.message, 'success');
        } catch (err) {
          showAlert('changeAlert', err.message, 'danger');
        }
      });
    }
  
    // ----------------------------
    // DASHBOARD CON MENÚ
    // ----------------------------
    const userSpan = document.getElementById('userSpan');
    if (userSpan) {
      userSpan.textContent = username;
      const main = document.getElementById('mainContent');
  
      document.getElementById('linkProfile').addEventListener('click', () => {
        main.innerHTML = `
          <h4>Perfil de usuario</h4>
          <p>Bienvenido, <strong>${username}</strong>.</p>
        `;
      });
  
      document.getElementById('linkChange').addEventListener('click', () => {
        main.innerHTML = `
          <h4>Cambiar contraseña</h4>
          <div id="changeAlert"></div>
          <form id="changeForm">
            <div class="mb-3">
              <label class="form-label">Actual</label>
              <input type="password" id="currentPassword" class="form-control" required>
            </div>
            <div class="mb-3">
              <label class="form-label">Nueva</label>
              <input type="password" id="newPassword" class="form-control" required>
            </div>
            <button class="btn btn-success">Actualizar</button>
          </form>
        `;
        // reenganchar listener de changeForm tras inyección
        const evt = new Event('DOMContentLoaded');
        document.dispatchEvent(evt);
      });
  
      document.getElementById('linkOther').addEventListener('click', () => {
        main.innerHTML = `
          <h4>Otras funciones</h4>
          <p>Aquí puedes agregar más opciones.</p>
        `;
      });
    }
  });
  