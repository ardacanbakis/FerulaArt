/**
 * Ferula Art — CMS Login (admin.js)
 * Handles sign-in and redirects to dashboard.html
 */
(() => {
  const loginForm  = document.getElementById('loginForm');
  const loginError = document.getElementById('loginError');
  const loginBtn   = document.getElementById('loginBtn');
  const pwToggle   = document.getElementById('pwToggle');
  const pwInput    = document.getElementById('password');

  // Password visibility toggle
  pwToggle?.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
  });

  // If already signed in, go straight to dashboard
  auth.onAuthStateChanged(user => {
    if (user) window.location.href = 'dashboard.html';
  });

  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';

    const email    = document.getElementById('email').value.trim();
    const password = pwInput.value;

    loginBtn.disabled = true;
    loginBtn.classList.add('loading');

    try {
      await auth.signInWithEmailAndPassword(email, password);
      window.location.href = 'dashboard.html';
    } catch (err) {
      loginError.textContent = authError(err.code);
      loginBtn.disabled = false;
      loginBtn.classList.remove('loading');
    }
  });

  function authError(code) {
    const map = {
      'auth/user-not-found':    'Bu e-posta ile kayıtlı hesap bulunamadı.',
      'auth/wrong-password':    'Şifre yanlış.',
      'auth/invalid-email':     'Geçersiz e-posta adresi.',
      'auth/too-many-requests': 'Çok fazla deneme. Lütfen bekleyin.',
      'auth/invalid-credential':'E-posta veya şifre yanlış.',
    };
    return map[code] || 'Giriş başarısız. Lütfen tekrar deneyin.';
  }
})();
