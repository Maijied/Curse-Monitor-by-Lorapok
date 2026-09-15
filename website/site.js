(() => {
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
        // Fallback for older browsers / insecure contexts
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

  // Soft year stamp if present
  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
