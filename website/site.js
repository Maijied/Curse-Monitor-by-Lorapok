(() => {
  const LARVAE_VIEWBOX = "0 0 64 88";

  function larvaeSvg(width) {
    const height = Math.round(width * 1.35);
    return `<svg width="${width}" height="${height}" viewBox="${LARVAE_VIEWBOX}" fill="none" xmlns="http://www.w3.org/2000/svg" class="larvae-loader-root" aria-hidden="true">
      <ellipse class="larvae-trail" cx="32" cy="82" rx="18" ry="4" fill="#39ff14" opacity="0.2"></ellipse>
      <g class="larvae-leg-left"><path d="M22 72 L16 82 M28 76 L22 86" stroke="#5b9dff" stroke-width="2.2" stroke-linecap="round" opacity="0.75"></path></g>
      <g class="larvae-leg-right"><path d="M42 72 L48 82 M36 76 L42 86" stroke="#5b9dff" stroke-width="2.2" stroke-linecap="round" opacity="0.75"></path></g>
      <ellipse class="larvae-segment larvae-segment-3" cx="32" cy="62" rx="22" ry="14" fill="#2d3748" stroke="#4a5568" stroke-width="1"></ellipse>
      <ellipse class="larvae-segment larvae-segment-2" cx="32" cy="46" rx="19" ry="13" fill="#374151" stroke="#4a5568" stroke-width="1"></ellipse>
      <ellipse class="larvae-segment larvae-segment-1" cx="32" cy="32" rx="16" ry="12" fill="#3d4a5c" stroke="#5b9dff" stroke-width="0.8"></ellipse>
      <path d="M24 38 Q32 44 40 38" stroke="#39ff14" stroke-width="2.2" stroke-linecap="round" opacity="0.8"></path>
      <ellipse cx="26" cy="28" rx="7" ry="8" fill="#0a0e14" stroke="#39ff14" stroke-width="0.8"></ellipse>
      <ellipse cx="38" cy="28" rx="7" ry="8" fill="#0a0e14" stroke="#39ff14" stroke-width="0.8"></ellipse>
      <circle class="larvae-eye" cx="26" cy="28" r="4.5" fill="#39ff14"></circle>
      <circle class="larvae-eye larvae-eye-right" cx="38" cy="28" r="4.5" fill="#39ff14"></circle>
      <circle cx="24.5" cy="26.5" r="1.2" fill="white" opacity="0.9"></circle>
      <circle cx="36.5" cy="26.5" r="1.2" fill="white" opacity="0.9"></circle>
    </svg>`;
  }

  document.querySelectorAll(".btn-larvae-loader, .welcome-larvae").forEach((slot) => {
    if (slot.dataset.larvaeReady === "1") return;
    const size = Number(slot.getAttribute("data-larvae-size") || 20);
    slot.innerHTML = larvaeSvg(size);
    slot.dataset.larvaeReady = "1";
  });

  const splash = document.getElementById("welcome-splash");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (splash) {
    const seen = sessionStorage.getItem("cm-welcome") === "1";
    if (!seen && !reduceMotion) {
      splash.hidden = false;
      splash.classList.remove("is-gone");
      const dismiss = () => {
        splash.classList.add("is-gone");
        splash.hidden = true;
        sessionStorage.setItem("cm-welcome", "1");
      };
      window.setTimeout(dismiss, 1600);
      splash.addEventListener("click", dismiss);
    }
  }

  const buttons = document.querySelectorAll("[data-copy]");

  buttons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const targetId = btn.getAttribute("data-copy");
      const el = targetId ? document.getElementById(targetId) : null;
      const text = (el?.textContent || btn.getAttribute("data-copy-text") || "").trim();
      if (!text) return;

      try {
        await navigator.clipboard.writeText(text);
        const prev = btn.textContent;
        btn.classList.add("copied");
        btn.textContent = "Copied";
        setTimeout(() => {
          btn.classList.remove("copied");
          btn.textContent = prev || "Copy";
        }, 1600);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        try {
          document.execCommand("copy");
          btn.classList.add("copied");
          btn.textContent = "Copied";
          setTimeout(() => {
            btn.classList.remove("copied");
            btn.textContent = "Copy";
          }, 1600);
        } finally {
          document.body.removeChild(ta);
        }
      }
    });
  });

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
