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

  const normalizeWhatsApp = (value) => {
    const digits = String(value ?? "").replace(/\D/g, "");
    if (!digits) return "";
    return digits.startsWith("55") ? digits : "55" + digits;
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  };

  function downloadICS(text, filename) {
    const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Arquivo de agenda criado.");
  }

  window.convite = () => {
    if (!event) {
      toast("Nenhum evento cadastrado.");
      return;
    }

    const shareText =
      event.title + "\n" +
      event.date + " • " + event.time + "\n" +
      event.address + " • " + event.city;

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Aldeia Tupinamba//Portal//PT-BR",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      "UID:" + event.id + "@aldeia.tupinamba",
      "DTSTAMP:20260905T120000Z",
      "DTSTART:20260926T220000Z",
      "DTEND:20260927T010000Z",
      "SUMMARY:" + event.title,
      "LOCATION:" + event.address + " - " + event.city,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");

    openModal(
      "<span class='eyebrow'>CONVITE</span>" +
      "<h2>" + escapeHtml(event.title) + "</h2>" +
      "<p><strong>" + escapeHtml(event.date) + "</strong> • " + escapeHtml(event.time) + "</p>" +
      "<p>" + escapeHtml(event.address) + " • " + escapeHtml(event.city) + "</p>" +
      "<div class='modal-actions'>" +
      "<button class='btn' id='icsBtn' type='button'>Adicionar à agenda</button>" +
      "<button class='btn secondary' id='shareBtn' type='button'>Compartilhar</button>" +
      "</div>"
    );

    $("#icsBtn")?.addEventListener("click", () => {
      downloadICS(ics, "festa-cosme-e-damiao-2026.ics");
    });

    $("#shareBtn")?.addEventListener("click", async () => {
      if (navigator.share) {
        await navigator.share({
          title: event.title,
          text: shareText
        }).catch(() => {});
      } else {
        const ok = await copyText(shareText);
        toast(ok ? "Convite copiado para a área de transferência." : "Não foi possível copiar o convite.");
      }
    });
  };

  window.login = (kind) => {
    location.href = kind === "ADM" ? "login-adm.html" : "filhos.html";
  };

  window.copyDonation = async () => {
    const key = data.donation?.pixKey;
    if (!key) {
      toast("A chave PIX ainda não foi cadastrada pela administração.");
      return;
    }
    const ok = await copyText(key);
    toast(ok ? "Chave PIX copiada." : "Não foi possível copiar automaticamente.");
  };

  window.donationWhatsApp = (form) => {
    const value = form?.querySelector("[name='donationValue']")?.value.trim() || "";
    const purpose = form?.querySelector("[name='donationPurpose']")?.value.trim() || "";
    const note = form?.querySelector("[name='donationNote']")?.value.trim() || "";

    if (!purpose) {
      toast("Escolha a finalidade da doação.");
      form?.querySelector("[name='donationPurpose']")?.focus();
      return;
    }

    const body = [
      "Olá! Gostaria de realizar uma doação para a Aldeia Tupinambá.",
      value ? "Valor: R$ " + value : "Valor: a confirmar",
      "Finalidade: " + purpose,
      note ? "Observação: " + note : ""
    ].filter(Boolean).join("\n");

    const target = normalizeWhatsApp(data.contact?.whatsapp);
    if (!target) {
      copyText(body);
      toast("Mensagem de doação copiada.");
      return;
    }

    location.href = "https://wa.me/" + target + "?text=" + encodeURIComponent(body);
  };

  window.sendContact = (form) => {
    const name = form.name.value.trim();
    const whatsapp = form.whatsapp.value.trim();
    const message = form.message.value.trim();
    const body = "Nome: " + name + "\nWhatsApp: " + whatsapp + "\n\n" + message;
    const target = normalizeWhatsApp(data.contact?.whatsapp);

    if (target) {
      location.href = "https://wa.me/" + target + "?text=" + encodeURIComponent(body);
    } else {
      copyText(body);
      toast("Mensagem copiada.");
      form.reset();
    }
  };

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c]));
  }

  document.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();

    if (e.target.closest("[data-copy-message]")) {
      const msg = data.contact?.message || "Olá! Gostaria de obter informações.";
      copyText(msg);
      toast("Mensagem copiada.");
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  const menu = $("#menu");
  const nav = $("#nav");

  menu?.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menu.setAttribute("aria-expanded", String(open));
  });

  nav?.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });

  document.addEventListener("DOMContentLoaded", () => {
    const year = new Date().getFullYear();
    document.querySelectorAll("[data-year]").forEach((el) => {
      el.textContent = year;
    });

    if (event) {
      document.querySelectorAll("[data-event-title]").forEach((el) => {
        el.textContent = event.title;
      });
      document.querySelectorAll("[data-event-date]").forEach((el) => {
        el.textContent = event.date + " • " + event.time;
      });
      document.querySelectorAll("[data-event-address]").forEach((el) => {
        el.textContent = event.address + " • " + event.city;
      });
    }

    document.querySelectorAll("[data-whatsapp]").forEach((el) => {
      const digits = normalizeWhatsApp(data.contact?.whatsapp);
      if (digits) {
        el.href = "https://wa.me/" + digits;
        el.textContent = "WhatsApp oficial: (67) 99342-405";
      }
    });

    document.querySelectorAll("[data-pix-key]").forEach((el) => {
      el.textContent = data.donation?.pixKey || "PIX não cadastrado";
    });

    const note = $("[data-donation-note]");
    if (note) note.textContent = data.donation?.note || "";
  });
})();