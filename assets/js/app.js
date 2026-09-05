(() => {
  const $ = (s, root = document) => root.querySelector(s);
  const data = window.ALDEIA_DATA || {};
  const event = data.events?.[0];

  const toast = (message) => {
    const el = $("#toast");
    if (!el) return;
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(() => el.classList.remove("show"), 2800);
  };
  window.toast = toast;

  const modal = $("#modal");
  const content = $("#content");
  const closeModal = () => {
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
  };
  window.fechar = closeModal;

  const openModal = (html) => {
    if (!modal || !content) return;
    content.innerHTML = html;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    $(".x", modal)?.focus();
  };

  window.convite = () => {
    if (!event) return;
    const text = encodeURIComponent(
      event.title + "\n" + event.date + " • " + event.time + "\n" +
      event.address + " • " + event.city
    );
    const ics = [
      "BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Aldeia Tupinamba//Portal//PT-BR",
      "BEGIN:VEVENT","UID:" + event.id + "@aldeia.tupinamba",
      "DTSTAMP:20260905T120000Z","DTSTART:20260926T220000Z","DTEND:20260927T010000Z",
      "SUMMARY:" + event.title,"LOCATION:" + event.address + " - " + event.city,
      "END:VEVENT","END:VCALENDAR"
    ].join("\r\n");
    openModal(
      "<span class='eyebrow'>CONVITE</span><h2>" + escapeHtml(event.title) + "</h2>" +
      "<p><strong>" + escapeHtml(event.date) + "</strong> • " + escapeHtml(event.time) + "</p>" +
      "<p>" + escapeHtml(event.address) + " • " + escapeHtml(event.city) + "</p>" +
      "<div class='modal-actions'>" +
      "<button class='btn' id='icsBtn'>Adicionar à agenda</button>" +
      "<button class='btn secondary' id='shareBtn'>Compartilhar</button></div>"
    );
    $("#icsBtn")?.addEventListener("click", () => downloadICS(ics, "festa-cosme-e-damiao-2026.ics"));
    $("#shareBtn")?.addEventListener("click", async () => {
      if (navigator.share) await navigator.share({ title: event.title, text: decodeURIComponent(text) }).catch(() => {});
      else { await copyText(decodeURIComponent(text)); toast("Convite copiado para a área de transferência."); }
    });
  };

  window.login = (kind) => {
    location.href = kind === "ADM" ? "login-adm.html" : "filhos.html";
  };

  function downloadICS(text, filename) {
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    toast("Arquivo de agenda criado.");
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const area = document.createElement("textarea");
      area.value = text; document.body.appendChild(area); area.select();
      const ok = document.execCommand("copy"); area.remove(); return ok;
    }
  }

  window.copyDonation = async () => {
    const key = data.donation?.pixKey;
    if (!key) { toast("A chave PIX ainda não foi cadastrada pela administração."); return; }
    await copyText(key); toast("Chave PIX copiada.");
  };

  window.sendContact = (form) => {
    const name = form.name.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const message = form.message.value.trim();
    const body = encodeURIComponent("Nome: " + name + "\nWhatsApp: " + whatsapp + "\n\n" + message);
    const target = data.contact?.whatsapp;
    if (target) location.href = "https://wa.me/" + target.replace(/\D/g, "") + "?text=" + body;
    else { copyText(decodeURIComponent(body)); toast("Mensagem copiada. Cadastre o WhatsApp oficial para envio direto."); form.reset(); }
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
  }

  document.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
    if (e.target.closest("[data-copy-message]")) {
      const msg = data.contact?.message || "Olá! Gostaria de obter informações.";
      copyText(msg); toast("Mensagem copiada.");
    }
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  const menu = $("#menu"), nav = $("#nav");
  menu?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });
  nav?.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

  document.addEventListener("DOMContentLoaded", () => {
    const year = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach(el => el.textContent = year);
    if (event) {
      document.querySelectorAll("[data-event-title]").forEach(el => el.textContent = event.title);
      document.querySelectorAll("[data-event-date]").forEach(el => el.textContent = event.date + " • " + event.time);
      document.querySelectorAll("[data-event-address]").forEach(el => el.textContent = event.address + " • " + event.city);
    }
  });
})();