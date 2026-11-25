(() => {
  const ACCESS_CODE = "DALMA2026";
  try {
    if (sessionStorage.getItem("dalma_access_granted") === "yes") return;
  } catch (_) {}

  const style = document.createElement("style");
  style.textContent = `
    #dalma-access-screen{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at top,#30204b,#100d18 65%);font-family:system-ui,-apple-system,sans-serif;color:#f5efff}
    #dalma-access-card{width:min(100%,390px);padding:30px 24px;border:1px solid #72569a;border-radius:22px;background:#191322;box-shadow:0 20px 80px #0009;text-align:center}
    #dalma-access-card h1{margin:0 0 9px;font-size:27px}#dalma-access-card p{color:#c8b9d9;line-height:1.5}
    #dalma-access-card input{box-sizing:border-box;width:100%;padding:14px;margin:12px 0;border:1px solid #71558d;border-radius:12px;background:#100d18;color:white;font-size:17px;text-align:center;letter-spacing:2px}
    #dalma-access-card button{width:100%;padding:14px;border:0;border-radius:12px;background:#a77be0;color:#170e22;font-size:16px;font-weight:700}
    #dalma-access-error{min-height:22px;color:#ff9eae;font-size:14px}
  `;
  document.head.appendChild(style);
  const screen = document.createElement("div");
  screen.id = "dalma-access-screen";
  screen.innerHTML = '<div id="dalma-access-card"><h1>DALMA ROLEPLAY</h1><p>Закрытое пространство для нашей компании.<br>Введи код доступа, чтобы продолжить.</p><form id="dalma-access-form"><input id="dalma-access-input" type="password" placeholder="Код доступа" autocomplete="current-password" required><button type="submit">Войти</button><div id="dalma-access-error" aria-live="polite"></div></form></div>';
  document.body.appendChild(screen);
  const input = document.getElementById("dalma-access-input");
  input.focus();
  document.getElementById("dalma-access-form").addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value.trim() === ACCESS_CODE) {
      try { sessionStorage.setItem("dalma_access_granted", "yes"); } catch (_) {}
      screen.remove();
    } else {
      document.getElementById("dalma-access-error").textContent = "Неверный код. Попробуй ещё раз.";
      input.select();
    }
  });
})();