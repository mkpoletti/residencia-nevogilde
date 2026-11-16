(() => {
  const S = window.SITE || {};
  const html = document.documentElement;
  const reduzir = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = matchMedia("(max-width: 760px)").matches;

  /* ── Texto dividido em palavras (sobem de uma máscara) ──────────────── */
  document.querySelectorAll("[data-split]").forEach((el) => {
    let w = 0;
    const partir = (no, alvo) => {
      [...no.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((pedaco) => {
            if (!pedaco) return;
            if (/^\s+$/.test(pedaco)) { alvo.appendChild(document.createTextNode(" ")); return; }
            const l = document.createElement("span"); l.className = "l";
            const p = document.createElement("span"); p.className = "p"; p.style.setProperty("--w", w++);
            p.textContent = pedaco; l.appendChild(p); alvo.appendChild(l);
          });
        } else if (n.nodeName === "BR") {
          alvo.appendChild(document.createElement("br"));
        } else {
          const copia = n.cloneNode(false);
          partir(n, copia);
          // cada palavra do <em> mantém o itálico
          [...copia.childNodes].forEach((c) => {
            if (c.classList && c.classList.contains("l")) {
              const e = n.cloneNode(false); e.textContent = c.firstChild.textContent; c.firstChild.textContent = ""; c.firstChild.appendChild(e);
            }
            alvo.appendChild(c);
          });
        }
      });
    };
    const frag = document.createElement("span");
    partir(el, frag);
    el.textContent = "";
    [...frag.childNodes].forEach((c) => el.appendChild(c));
    el.classList.add("split");
    el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  });

  /* ── Cortina de entrada / saída ─────────────────────────────────────── */
  const abrir = () => requestAnimationFrame(() => html.classList.add("pronto"));
  if (document.readyState === "complete") abrir(); else addEventListener("load", abrir);
  setTimeout(abrir, 1800); // nunca prende a página
  addEventListener("pageshow", (e) => { if (e.persisted) { html.classList.remove("saindo"); html.classList.add("pronto"); } });
  /* ── Rolagem suave (Lenis, se carregou) ─────────────────────────────── */
  let lenis = null;
  if (!reduzir && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: (t) => 1 - Math.pow(1 - t, 4), smoothWheel: true });
    const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  /* ── Revelar ao entrar na tela ──────────────────────────────────────── */
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("visto"); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: "0px 0px -6% 0px" });
  const alvos = document.querySelectorAll(".split, .sobe, .revela");
  const iniciar = () => alvos.forEach((el) => (el.closest(".momento") ? el.classList.add("visto") : io.observe(el)));
  setTimeout(iniciar, reduzir ? 0 : 450);

  /* ── Hero: o vídeo anda com a rolagem ───────────────────────────────── */
  const cine = document.querySelector(".cine");
  const canvas = cine && cine.querySelector("canvas");
  if (cine && canvas && S.frames && S.frames.total) {
    const ctx = canvas.getContext("2d");
    const total = S.frames.total;
    const padrao = celular ? S.frames.mobile : S.frames.desktop;
    const src = (i) => padrao.replace("{n}", String(i + 1).padStart(4, "0"));
    const quadros = new Array(total);
    const momentos = [...cine.querySelectorAll(".momento")];
    const barra = cine.querySelector(".progresso");
    let atual = 0, desenhado = -1;
    const carregar = (i) => {
      if (quadros[i]) return quadros[i];
      const img = new Image(); img.decoding = "async"; img.src = src(i);
      img.onload = () => { if (Math.round(atual) === i || desenhado === -1) desenhar(i, true); };
      return (quadros[i] = img);
    };
    carregar(0);
    if (!reduzir) {
      const fila = [];
      for (const passo of [8, 4, 2, 1]) for (let i = 0; i < total; i += passo) if (!fila.includes(i)) fila.push(i);
      let k = 0;
      const lote = () => { for (let n = 0; n < 6 && k < fila.length; n++) carregar(fila[k++]); if (k < fila.length) setTimeout(lote, 40); };
      lote();
    }
    const pronto = (i) => quadros[i] && quadros[i].complete && quadros[i].naturalWidth;
    const maisProximo = (i) => { for (let d = 0; d < total; d++) { if (pronto(i - d)) return i - d; if (pronto(i + d)) return i + d; } return -1; };
    function desenhar(i, forcar) {
      const j = maisProximo(i);
      if (j < 0 || (j === desenhado && !forcar)) return;
      const img = quadros[j], cw = canvas.width, ch = canvas.height;
      const esc = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
      const w = img.naturalWidth * esc, h = img.naturalHeight * esc;
      // no celular, puxa o enquadramento para a direita (onde estão os médicos)
      const x = celular ? (cw - w) * 0.55 : (cw - w) / 2;
      ctx.drawImage(img, x, (ch - h) / 2, w, h);
      desenhado = j;
    }
    const ajustar = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
      desenhado = -1; desenhar(Math.round(atual), true);
    };
    const progresso = () => { const r = cine.getBoundingClientRect(); const curso = cine.offsetHeight - innerHeight; return Math.min(1, Math.max(0, -r.top / (curso || 1))); };
    const momentosPor = (p) => {
      for (const m of momentos) {
        const de = +m.dataset.de, ate = +m.dataset.ate;
        m.classList.toggle("ativo", html.classList.contains("pronto") && p >= de && (p < ate || (ate >= 1 && p >= 1)));
      }
      cine.classList.toggle("andou", p > 0.02);
      if (barra) barra.style.setProperty("--p", p.toFixed(4));
    };
    const quadro = () => {
      const alvo = progresso() * (total - 1);
      atual += (alvo - atual) * 0.16;
      if (Math.abs(alvo - atual) < 0.05) atual = alvo;
      desenhar(Math.round(atual));
      momentosPor(atual / (total - 1));
      requestAnimationFrame(quadro);
    };
    addEventListener("resize", ajustar);
    ajustar();
    if (reduzir) momentosPor(0); else requestAnimationFrame(quadro);
  }

  /* ── Parallax suave ─────────────────────────────────────────────────── */
  const par = reduzir ? [] : [...document.querySelectorAll("[data-parallax]")];
  if (par.length) {
    const mover = () => {
      for (const el of par) {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        const c = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.transform = `translate3d(0, ${(c * -(+el.dataset.parallax || 80)).toFixed(1)}px, 0)`;
      }
      requestAnimationFrame(mover);
    };
    requestAnimationFrame(mover);
  }

  /* ── Cabeçalho: esconde ao descer, volta ao subir ───────────────────── */
  const topo = document.querySelector(".topo");
  const whats = document.querySelector(".whats");
  let ultimo = 0, formNaTela = false;
  const aoRolar = () => {
    const y = scrollY;
    const fimHero = cine ? cine.offsetHeight - innerHeight * 0.9 : 60;
    topo && topo.classList.toggle("rolou", y > fimHero);
    if (topo && !html.classList.contains("menu-aberto")) topo.classList.toggle("esconde", y > fimHero + 200 && y > ultimo + 2);
    if (y < ultimo - 2 || y < fimHero + 200) topo && topo.classList.remove("esconde");
    ultimo = y;
    whats && whats.classList.toggle("visivel", y > innerHeight * 0.5 && !formNaTela);
  };
  addEventListener("scroll", aoRolar, { passive: true });
  aoRolar();
  const formEl = document.querySelector(".form");
  if (formEl && celular) new IntersectionObserver(([e]) => { formNaTela = e.isIntersecting; aoRolar(); }).observe(formEl);

  /* ── Menu no telemóvel ──────────────────────────────────────────────── */
  const mb = document.querySelector(".menu-btn");
  mb && mb.addEventListener("click", () => {
    const aberto = html.classList.toggle("menu-aberto");
    mb.setAttribute("aria-expanded", aberto);
    lenis && (aberto ? lenis.stop() : lenis.start());
  });

  /* ── Lista de serviços: troca a imagem ao passar ────────────────────── */
  const visor = document.querySelector(".servicos-home .arte img");
  document.querySelectorAll(".lista a[data-img]").forEach((a) => a.addEventListener("mouseenter", () => {
    if (!visor || visor.dataset.atual === a.dataset.img) return;
    visor.style.opacity = 0;
    setTimeout(() => { visor.src = a.dataset.img; visor.dataset.atual = a.dataset.img; visor.onload = () => (visor.style.opacity = 1); }, 250);
  }));

  /* ── Perguntas frequentes com altura animada ────────────────────────── */
  document.querySelectorAll(".faq details").forEach((d) => {
    const resp = d.querySelector(".resp"), s = d.querySelector("summary");
    if (d.open) resp.style.height = "auto";
    s.addEventListener("click", (e) => {
      e.preventDefault();
      if (d.open) {
        resp.style.height = resp.scrollHeight + "px";
        requestAnimationFrame(() => (resp.style.height = "0px"));
        setTimeout(() => (d.open = false), 600);
      } else {
        d.open = true;
        resp.style.height = resp.scrollHeight + "px";
        setTimeout(() => (resp.style.height = "auto"), 600);
      }
    });
  });

  /* ── Âncoras internas com rolagem suave ─────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const alvo = document.querySelector(a.getAttribute("href"));
    if (!alvo) return;
    e.preventDefault(); html.classList.remove("menu-aberto"); lenis && lenis.start();
    lenis ? lenis.scrollTo(alvo, { offset: -20, duration: 1.6 }) : alvo.scrollIntoView({ behavior: "smooth" });
  }));

  /* ── Galeria: arrastar, setas e ecrã inteiro ───────────────────────── */
  const trilho = document.querySelector(".trilho");
  if (trilho) {
    let x0 = 0, s0 = 0, moveu = false, baixo = false;
    trilho.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; baixo = true; moveu = false; x0 = e.clientX; s0 = trilho.scrollLeft; });
    addEventListener("pointermove", (e) => { if (!baixo) return; const d = e.clientX - x0; if (Math.abs(d) > 5) { moveu = true; trilho.classList.add("arrasta"); } trilho.scrollLeft = s0 - d; });
    addEventListener("pointerup", () => { baixo = false; setTimeout(() => trilho.classList.remove("arrasta"), 0); });
    const passo = () => trilho.clientWidth * 0.7;
    document.querySelector(".seta--ant")?.addEventListener("click", () => trilho.scrollBy({ left: -passo(), behavior: "smooth" }));
    document.querySelector(".seta--seg")?.addEventListener("click", () => trilho.scrollBy({ left: passo(), behavior: "smooth" }));
    const fotos = [...trilho.querySelectorAll("button")];
    const modal = document.querySelector(".modal--fotos"), img = modal.querySelector("img"), cont = modal.querySelector(".contador");
    let i = 0;
    const mostrar = (n) => { i = (n + fotos.length) % fotos.length; img.src = fotos[i].dataset.grande; img.alt = fotos[i].querySelector("img").alt; cont.textContent = `${i + 1} / ${fotos.length}`; };
    const fechar = () => { modal.classList.remove("aberto"); lenis && lenis.start(); };
    fotos.forEach((b, n) => b.addEventListener("click", (e) => { if (moveu) { e.preventDefault(); return; } mostrar(n); modal.classList.add("aberto"); lenis && lenis.stop(); }));
    modal.querySelector(".ant").addEventListener("click", () => mostrar(i - 1));
    modal.querySelector(".seg").addEventListener("click", () => mostrar(i + 1));
    modal.querySelector(".fechar").addEventListener("click", fechar);
    modal.addEventListener("click", (e) => { if (e.target === modal) fechar(); });
    addEventListener("keydown", (e) => { if (!modal.classList.contains("aberto")) return; if (e.key === "Escape") fechar(); if (e.key === "ArrowLeft") mostrar(i - 1); if (e.key === "ArrowRight") mostrar(i + 1); });
  }

  /* ── Filme em ecrã inteiro ─────────────────────────────────────────── */
  const filme = document.querySelector(".filme"), mv = document.querySelector(".modal--video");
  if (filme && mv) {
    const v = mv.querySelector("video");
    const fechar = () => { mv.classList.remove("aberto"); v.pause(); lenis && lenis.start(); };
    filme.addEventListener("click", () => { mv.classList.add("aberto"); v.currentTime = 0; v.play(); lenis && lenis.stop(); });
    mv.querySelector(".fechar").addEventListener("click", fechar);
    mv.addEventListener("click", (e) => { if (e.target === mv) fechar(); });
    addEventListener("keydown", (e) => { if (e.key === "Escape" && mv.classList.contains("aberto")) fechar(); });
  }

  /* ── Blog: filtro por categoria ─────────────────────────────────────── */
  document.querySelectorAll(".chips button").forEach((b, _, todos) => b.addEventListener("click", () => {
    todos.forEach((x) => x.classList.toggle("ativo", x === b));
    const cat = b.dataset.cat;
    document.querySelectorAll(".artigo[data-cat]").forEach((a) => a.classList.toggle("some", cat !== "todos" && a.dataset.cat !== cat));
  }));

  document.querySelectorAll("[data-ano]").forEach((el) => (el.textContent = new Date().getFullYear()));

  /* ── WhatsApp ───────────────────────────────────────────────────────── */
  if (S.whatsapp) {
    const num = String(S.whatsapp.numero || "").replace(/\D/g, "");
    document.querySelectorAll("[data-whats]").forEach((a) => {
      a.href = `https://wa.me/${num}?text=${encodeURIComponent(S.whatsapp.mensagem || "")}`;
      a.target = "_blank"; a.rel = "noopener";
    });
  }

  /* ── Formulário → e-mail ────────────────────────────────────────────── */
  const form = document.querySelector(".form");
  if (form && S.contato) {
    const status = form.querySelector(".form-status");
    const botao = form.querySelector("button[type=submit]");
    const avisar = (txt, tipo) => { status.textContent = txt; status.className = `form-status campo--inteiro ${tipo || ""}`; };
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (form.elements._honey.value) return;
      let valido = true;
      form.querySelectorAll("[required]").forEach((c) => {
        const ok = c.type === "checkbox" ? c.checked : c.type === "email" ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value) : c.value.trim().length > 1;
        (c.closest(".campo") || c.closest(".consent")).classList.toggle("erro", !ok);
        if (!ok) valido = false;
      });
      if (!valido) return avisar("Confirme os campos assinalados.", "falha");
      const dados = Object.fromEntries(new FormData(form));
      delete dados._honey;
      const assunto = S.contato.assunto || `Novo pedido pelo site ${S.nome || ""}`;
      let url, corpo;
      if (S.contato.web3formsChave) {
        url = "https://api.web3forms.com/submit";
        corpo = { access_key: S.contato.web3formsChave, subject: assunto, from_name: S.nome, ...dados };
      } else {
        url = `https://formsubmit.co/ajax/${encodeURIComponent(S.contato.email)}`;
        corpo = { _subject: assunto, _template: "table", _captcha: "false", ...dados };
      }
      botao.disabled = true; avisar("A enviar…");
      try {
        const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(corpo) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.success === false || j.success === "false") throw new Error(j.message || r.status);
        form.reset();
        avisar("Recebemos o seu pedido. Respondemos no próprio dia útil.", "ok");
      } catch (e) {
        console.warn("Falha no envio do formulário:", e);
        avisar("Não foi possível enviar agora. Fale connosco por WhatsApp.", "falha");
      } finally { botao.disabled = false; }
    });
  }
})();
