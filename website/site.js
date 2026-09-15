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

  document.querySelectorAll(".btn-larvae-loader").forEach((slot) => {
    if (slot.dataset.larvaeReady === "1") return;
    const size = Number(slot.getAttribute("data-larvae-size") || 20);
    slot.innerHTML = larvaeSvg(size);
    slot.dataset.larvaeReady = "1";
  });

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

  const mascot = document.getElementById("lorapok-mascot");
  if (mascot) {
    const lineEl = mascot.querySelector("[data-mascot-line]");
    const pupils = mascot.querySelectorAll(".mascot-pupil-track");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const WARD_LINE = "Warding your limits, cutely.";
    const MOODS = [
      ["ward", WARD_LINE],
      ["happy", "Let’s get you installed."],
      ["curious", "Hmm, what’s this command?"],
      ["scan", "Scanning your quotas…"],
      ["guard", "Token stays on your machine."],
      ["worried", "Honest limits — no dollar split."],
      ["angry", "Stale 100%? That makes Ward mad."],
      ["wink", "Grok Bot plugin. Ward’s in on it."],
      ["celebrate", "Copied. You’re clear."],
      ["proud", "Open source. Lorapok Labs, proudly."],
    ];
    let holdTimer = 0;
    let stickyUntil = 0;
    let cycling = false;

    const setMood = (mood, line, holdMs = 0) => {
      mascot.dataset.mood = mood || "ward";
      if (lineEl) lineEl.textContent = line || WARD_LINE;
      window.clearTimeout(holdTimer);
      stickyUntil = holdMs > 0 ? Date.now() + holdMs : 0;
      if (holdMs > 0) {
        holdTimer = window.setTimeout(() => {
          if (!cycling) setMood("ward", WARD_LINE);
        }, holdMs);
      }
    };

    setMood("ward", WARD_LINE);

    document.querySelectorAll("[data-mascot-mood]").forEach((el) => {
      const apply = () => {
        if (cycling) return;
        setMood(el.getAttribute("data-mascot-mood"), el.getAttribute("data-mascot-line"));
      };
      const reset = () => {
        if (cycling || Date.now() < stickyUntil) return;
        setMood("ward", WARD_LINE);
      };
      el.addEventListener("pointerenter", apply);
      el.addEventListener("focus", apply);
      el.addEventListener("pointerleave", reset);
      el.addEventListener("blur", reset);
      if (el.hasAttribute("data-copy")) {
        el.addEventListener("click", () => {
          setMood("celebrate", "Copied. You’re clear.", 1800);
        });
      }
    });

    mascot.addEventListener("click", async () => {
      cycling = true;
      for (let i = 0; i < MOODS.length; i += 1) {
        setMood(MOODS[i][0], MOODS[i][1]);
        await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 280 : 720));
      }
      cycling = false;
      setMood("ward", WARD_LINE);
    });

    if (!reduceMotion) {
      const blink = () => {
        if (mascot.dataset.mood !== "wink") {
          mascot.classList.add("is-blink");
          window.setTimeout(() => mascot.classList.remove("is-blink"), 120);
        }
        window.setTimeout(blink, 2200 + Math.random() * 2800);
      };
      window.setTimeout(blink, 1400);

      window.addEventListener("pointermove", (event) => {
        const rect = mascot.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = Math.max(-5, Math.min(5, ((event.clientX - cx) / rect.width) * 10));
        const dy = Math.max(-4, Math.min(4, ((event.clientY - cy) / rect.height) * 8));
        pupils.forEach((p) => {
          p.style.transform = `translate(${dx}px, ${dy}px)`;
        });
      });
    }
  }
})();
