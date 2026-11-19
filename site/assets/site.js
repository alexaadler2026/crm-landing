/* Atava CRM – скрипт сайта. Без библиотек. */
(function () {
'use strict';

/* ================= НАСТРОЙКИ – меняются здесь ================= */
var CONFIG = {
  // Адрес приемника заявок (веб-приложение Google Apps Script, см. priemnik/README.md)
  ENDPOINT: 'https://script.google.com/macros/s/ВСТАВЬТЕ_ID/exec',
  // Номер WhatsApp только цифрами, с кодом страны: '996700000000'. Пусто – кнопка скрыта
  WHATSAPP: '',
  WA_TEXT: 'Здравствуйте! Хочу записаться на демо Atava CRM',
  // Телефон для подвала, например '+996 700 000 000'. Пусто – не выводится
  PHONE: '',
  // Окончание акции (время Бишкека). После этой даты полоса акции и акционные цены скрываются
  PROMO_END: '2027-01-16T00:00:00+06:00',
  // Идентификаторы счетчиков. Пусто – счетчик не подключается
  GA_ID: '',          // 'G-XXXXXXXXXX'
  YM_ID: '',          // '12345678'
  META_PIXEL_ID: ''   // '1234567890'
};
/* ============================================================== */

window.ATAVA = CONFIG;
var d = document, html = d.documentElement, W = window;
var reduce = W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
var EASE = 'cubic-bezier(.22,1,.36,1)';
function $(s, c) { return (c || d).querySelector(s); }
function $$(s, c) { return [].slice.call((c || d).querySelectorAll(s)); }
function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
function ssSet(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function anim(el, kf, o) { if (!el || !el.animate) return null; o.easing = o.easing || EASE; o.fill = o.fill || 'both'; return el.animate(kf, o); }
function later(fn, ms) { return setTimeout(fn, ms); }
function onView(els, fn, opt) {
  if (!els.length) return;
  if (!('IntersectionObserver' in W)) { els.forEach(fn); return; }
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); fn(e.target); } });
  }, opt || { rootMargin: '0px 0px -8% 0px', threshold: 0.15 });
  els.forEach(function (el) { io.observe(el); });
}

/* ---------- аналитика ---------- */
function track(name, params) {
  params = params || {};
  try {
    if (W.gtag) gtag('event', name, params);
    if (W.ym && CONFIG.YM_ID) ym(+CONFIG.YM_ID, 'reachGoal', name, params);
    if (W.fbq) name === 'lead_submit' ? fbq('track', 'Lead', params) : fbq('trackCustom', name, params);
  } catch (e) {}
}
ATAVA.track = track;
function addScript(src) { var s = d.createElement('script'); s.async = true; s.src = src; d.head.appendChild(s); }
(function analytics() {
  if (CONFIG.GA_ID) {
    W.dataLayer = W.dataLayer || [];
    W.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', CONFIG.GA_ID);
  }
  if (CONFIG.YM_ID) {
    W.ym = W.ym || function () { (ym.a = ym.a || []).push(arguments); }; ym.l = +new Date();
    ym(+CONFIG.YM_ID, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true });
  }
  if (CONFIG.META_PIXEL_ID) {
    var n = W.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!W._fbq) W._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    fbq('init', CONFIG.META_PIXEL_ID); fbq('track', 'PageView');
  }
  W.addEventListener('load', function () {
    later(function () {
      if (CONFIG.GA_ID) addScript('https://www.googletagmanager.com/gtag/js?id=' + CONFIG.GA_ID);
      if (CONFIG.YM_ID) addScript('https://mc.yandex.ru/metrika/tag.js');
      if (CONFIG.META_PIXEL_ID) addScript('https://connect.facebook.net/en_US/fbevents.js');
    }, 1200);
  });
})();

/* ---------- UTM и источник первого визита ---------- */
if (!ssGet('atava_src')) {
  var q = new URLSearchParams(location.search), src = { ref: d.referrer || '' };
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { src[k] = q.get(k) || ''; });
  ssSet('atava_src', JSON.stringify(src));
}

/* ---------- акция по дате ---------- */
var promoOn = Date.now() < Date.parse(CONFIG.PROMO_END);
if (!promoOn) {
  html.classList.add('no-promo');
  $$('[data-promo]').forEach(function (e) { e.hidden = true; });
  $$('[data-nopromo]').forEach(function (e) { e.hidden = false; });
}

/* ---------- WhatsApp и телефон ---------- */
var waUrl = CONFIG.WHATSAPP ? 'https://wa.me/' + CONFIG.WHATSAPP.replace(/\D/g, '') + '?text=' + encodeURIComponent(CONFIG.WA_TEXT) : '';
$$('[data-wa]').forEach(function (a) {
  if (!waUrl) return;
  a.href = waUrl; a.target = '_blank'; a.rel = 'noopener'; a.hidden = false;
});
if (CONFIG.PHONE) $$('[data-phone]').forEach(function (a) { a.href = 'tel:' + CONFIG.PHONE.replace(/[^\d+]/g, ''); a.textContent = CONFIG.PHONE; a.hidden = false; });
d.addEventListener('click', function (e) {
  var a = e.target.closest && e.target.closest('a[href*="wa.me"]');
  if (a) track('whatsapp_click', { page: location.pathname });
});
var waFloat = $('.wa-float'), demo = $('#demo');
if (waFloat && demo && waUrl && 'IntersectionObserver' in W) {
  new IntersectionObserver(function (en) { waFloat.classList.toggle('is-hidden', en[0].isIntersecting); }).observe(demo);
}

/* ---------- меню и шапка ---------- */
var nav = $('.nav'), tog = $('.nav__toggle');
function closeMenu() { nav.classList.remove('is-open'); tog.setAttribute('aria-expanded', 'false'); }
if (tog) {
  tog.addEventListener('click', function () { tog.setAttribute('aria-expanded', nav.classList.toggle('is-open')); });
  $$('#menu a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('is-open')) { closeMenu(); tog.focus(); } });
}
/* кнопка «наверх»: создается скриптом, видна после второго экрана */
var toTop = d.createElement('button');
toTop.type = 'button';
toTop.className = 'to-top';
toTop.setAttribute('aria-label', 'Наверх');
toTop.tabIndex = -1;
toTop.setAttribute('aria-hidden', 'true');
toTop.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5.5 11.5L12 5l6.5 6.5"/></svg>';
d.body.appendChild(toTop);
toTop.addEventListener('click', function () {
  W.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  var logo = $('.nav__logo'); if (logo) logo.focus({ preventScroll: true });
});

var header = $('.site-header'), ticking = false;
function onScroll() {
  ticking = false;
  if (header) header.classList.toggle('is-compact', W.scrollY > 80);
  var on = W.scrollY > W.innerHeight * 2;
  if (on !== toTop.classList.contains('is-on')) { toTop.classList.toggle('is-on', on); toTop.tabIndex = on ? 0 : -1; toTop.setAttribute('aria-hidden', on ? 'false' : 'true'); }
}
W.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
onScroll();

/* ---------- появление секций ---------- */
var reveals = $$('.reveal');
if (reduce) reveals.forEach(function (e) { e.classList.add('is-in'); });
else onView(reveals, function (e) { e.classList.add('is-in'); }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });

/* ---------- счетчики и пары «было → стало» ---------- */
function countUp(el) {
  var end = +el.dataset.end, t0 = 0;
  function step(t) {
    if (!t0) t0 = t;
    var p = Math.min((t - t0) / 1200, 1);
    el.textContent = Math.round(end * (1 - Math.pow(1 - p, 4)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
if (!reduce) {
  var counters = $$('[data-count]');
  counters.forEach(function (el) {
    el.dataset.end = parseInt(el.textContent, 10);
    el.style.display = 'inline-block'; el.style.textAlign = 'right';
    el.style.minWidth = el.getBoundingClientRect().width + 'px';
    if (!el.closest('.pair')) el.textContent = '0';
  });
  var pairs = $$('.pair');
  pairs.forEach(function (p) { p.classList.add('is-anim'); });
  onView(counters.filter(function (el) { return !el.closest('.pair'); }), countUp);
  onView(pairs, function (p) {
    later(function () {
      p.classList.add('is-done');
      var c = $('[data-count]', p);
      if (c) { c.textContent = '0'; countUp(c); }
    }, 500);
  });
}

/* ---------- чат-бот в «Возможностях» ---------- */
var chat = $('#bot-chat');
if (chat && !reduce && chat.animate) {
  var steps = $$('[data-step]', chat);
  steps.forEach(function (s) { s.style.opacity = '0'; });
  chat.style.position = 'relative';
  onView([chat], function () {
    var t = 200;
    steps.forEach(function (s) {
      if (s.hasAttribute('data-typing')) {
        var ty = d.createElement('div');
        ty.className = 'typing'; ty.setAttribute('aria-hidden', 'true'); ty.innerHTML = '<i></i><i></i><i></i>';
        ty.style.left = s.offsetLeft + 'px'; ty.style.top = s.offsetTop + 'px';
        chat.appendChild(ty);
        anim(ty, [{ opacity: 0, transform: 'scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: t });
        anim(ty, [{ opacity: 1 }, { opacity: 0 }], { duration: 250, delay: t + 1050, fill: 'forwards' });
        t += 1200;
      }
      var a = anim(s, [{ opacity: 0, transform: 'translateY(10px) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: t });
      a.onfinish = function () { s.style.opacity = ''; };
      t += 600;
    });
  }, { threshold: 0.5 });
}

/* ---------- блок отчетов ---------- */
function growBars(panel) {
  if (reduce || !panel) return;
  $$('.fbar__fill', panel).forEach(function (b, i) {
    anim(b, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 1000, delay: 110 * i });
  });
  $$('.cols div', panel).forEach(function (b, i) {
    anim(b, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: 1000, delay: 110 * i });
  });
}
var screen = $('#report-screen');
if (screen) {
  $$('[data-report]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var k = btn.dataset.report;
      $$('[data-report]').forEach(function (b) { b.setAttribute('aria-pressed', b === btn); });
      $$('[data-tab]', screen).forEach(function (t) { t.classList.toggle('is-on', t.dataset.tab === k); });
      $$('[data-panel]', screen).forEach(function (p) {
        var on = p.dataset.panel === k;
        p.classList.toggle('is-on', on);
        if (on && !reduce) { anim(p, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 500 }); growBars(p); }
      });
    });
  });
  onView([screen], function () { growBars($('.panel.is-on', screen)); }, { threshold: 0.3 });
}

/* ---------- переключатель тарифов ---------- */
var modeBtns = $$('button[data-mode]'), priceBoxes = $$('.prices');
function setMode(m, animate) {
  modeBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === m); });
  priceBoxes.forEach(function (p) {
    p.dataset.mode = m;
    if (animate && !reduce) $$('[data-set="' + m + '"] .price__now, [data-set="' + m + '"] .price__note', p).forEach(function (n) {
      anim(n, [{ opacity: 0, transform: 'perspective(500px) rotateX(-70deg) translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 380 });
    });
  });
}
if (modeBtns.length) {
  modeBtns.forEach(function (b) { b.addEventListener('click', function () { setMode(b.dataset.mode, true); }); });
  setMode(promoOn ? 'promo' : 'month', false);
}

/* ---------- выбор тарифа → форма ---------- */
function setPlan(name) {
  $$('form[data-lead]').forEach(function (f) {
    f.elements.plan.value = name || '';
    var l = $('[data-plan-label]', f);
    if (l) { l.textContent = name ? 'Тариф: «' + name + '»' : ''; l.hidden = !name; }
  });
}
$$('[data-plan]').forEach(function (a) { a.addEventListener('click', function () { setPlan(a.dataset.plan); }); });
var urlPlan = new URLSearchParams(location.search).get('plan');
if (urlPlan) setPlan(urlPlan.slice(0, 40));

/* ---------- формы заявок ---------- */
var loadedAt = Date.now();
function normPhone(v) {
  var n = v.replace(/\D/g, '');
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.length === 9) n = '996' + n;
  else if (n.length === 10 && n[0] === '0') n = '996' + n.slice(1);
  return '+' + n;
}
function fieldError(input, msg) {
  var err = d.getElementById(input.id + '-err');
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  if (err) err.textContent = msg || '';
  return !msg;
}
$$('form[data-lead]').forEach(function (f) {
  f.action = CONFIG.ENDPOINT;
  $$('.err', f).forEach(function (e) { e.setAttribute('aria-live', 'polite'); });
  var btn = $('button[type="submit"]', f), btnText = btn.textContent, fail = $('.form__fail', f);
  var name = f.elements.name, phone = f.elements.phone;
  [name, phone].forEach(function (i) { i.addEventListener('input', function () { if (i.getAttribute('aria-invalid') === 'true') validate(i); }); });
  function validate(i) {
    if (i === name) return fieldError(name, name.value.trim() ? '' : 'Укажите, как к вам обращаться');
    return fieldError(phone, phone.value.replace(/\D/g, '').length >= 9 ? '' : 'Проверьте номер: нужно не меньше 9 цифр');
  }
  function showFail() {
    fail.innerHTML = '';
    var p = d.createElement('span');
    if (waUrl) {
      p.textContent = 'Не удалось отправить. Напишите нам в WhatsApp';
      var a = d.createElement('a'); a.className = 'btn btn--wa'; a.href = waUrl; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Написать в WhatsApp';
      fail.appendChild(p); fail.appendChild(a);
    } else {
      p.innerHTML = 'Не удалось отправить. Напишите нам: <a href="mailto:hello@atava.kg">hello@atava.kg</a>';
      fail.appendChild(p);
    }
    fail.hidden = false;
    btn.disabled = false; btn.textContent = btnText;
  }
  f.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok1 = validate(name), ok2 = validate(phone);
    if (!ok1 || !ok2) { (ok1 ? phone : name).focus(); return; }
    if (btn.disabled) return;
    fail.hidden = true;
    btn.disabled = true; btn.textContent = 'Отправляем…';
    // ловушка для ботов: заполненное скрытое поле или отправка быстрее 3 секунд
    if (f.elements.website.value || Date.now() - loadedAt < 3000) { later(showFail, 600); return; }
    var data = new URLSearchParams();
    var src = {}; try { src = JSON.parse(ssGet('atava_src') || '{}'); } catch (x) {}
    data.set('name', name.value.trim());
    data.set('phone', normPhone(phone.value));
    data.set('industry', f.elements.industry ? f.elements.industry.value : '');
    data.set('plan', f.elements.plan.value);
    data.set('call_time', f.elements.call_time ? f.elements.call_time.value.trim() : '');
    data.set('page', location.origin + location.pathname);
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) { data.set(k, src[k] || ''); });
    data.set('referrer', src.ref || '');
    data.set('website', '');
    data.set('elapsed', String(Date.now() - loadedAt));
    data.set('ajax', '1');
    if (CONFIG.ENDPOINT.indexOf('ВСТАВЬТЕ') > -1) { later(showFail, 400); return; }
    var ctrl = W.AbortController ? new AbortController() : null;
    if (ctrl) later(function () { ctrl.abort(); }, 15000);
    fetch(CONFIG.ENDPOINT, { method: 'POST', body: data, signal: ctrl && ctrl.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (!j || !j.ok) throw new Error('fail');
        ssSet('atava_lead', JSON.stringify({ industry: data.get('industry'), plan: data.get('plan'), page: location.pathname }));
        location.href = '/spasibo/';
      })
      .catch(showFail);
  });
});

/* ---------- страница «Спасибо»: событие lead_submit ---------- */
if (d.body.hasAttribute('data-thanks')) {
  var lead = ssGet('atava_lead');
  if (lead) { try { track('lead_submit', JSON.parse(lead)); } catch (x) {} try { sessionStorage.removeItem('atava_lead'); } catch (x) {} }
}

/* ---------- первый экран: сцена «хаос собирается в одно окно» ---------- */
var OUT = 'cubic-bezier(.22,1,.36,1)', SPRING = 'cubic-bezier(.34,1.45,.64,1)', SOFT = 'cubic-bezier(.34,1.2,.64,1)', INOUT = 'cubic-bezier(.65,0,.35,1)';
function tr(x, y, s, r) { return 'translate3d(' + x + 'px,' + y + 'px,0)' + (s != null ? ' scale(' + s + ')' : '') + (r ? ' rotate(' + r + 'deg)' : ''); }
function at(ms, fn) { return later(fn, ms); }
var stage = $('#stage'), list = $('#msgs');
if (stage && list && !reduce && stage.animate) {
  var mobile = W.innerWidth < 768;
  if (ssGet('atava_hero')) startLoop();
  else {
    ssSet('atava_hero', '1');
    $('#inbox').style.opacity = '0';
    // ждем шрифты (не дольше 600 мс), чтобы карточки не меняли размер посреди сцены
    var go = false, run = function () { if (go) return; go = true; (mobile ? sceneMobile : sceneDesktop)(); };
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { requestAnimationFrame(run); });
    later(run, 600);
  }
}

function sceneMobile() {
  var inbox = $('#inbox');
  var a = anim(inbox, [{ opacity: 0, transform: 'translateY(12px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 600, easing: OUT });
  a.onfinish = function () { a.cancel(); };
  inbox.style.opacity = '';
  $$('.msg', list).forEach(function (r, i) {
    var b = anim(r, [{ opacity: 0, transform: 'translateY(-26px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: 250 + i * 150, easing: SOFT });
    b.onfinish = function () { b.cancel(); };
  });
  later(startLoop, 1500);
}

function sceneDesktop() {
  var inbox = $('#inbox'), count = $('#inbox-count');
  var rows = $$('.msg', list), sr = stage.getBoundingClientRect();
  var SW = sr.width, SH = sr.height;
  var layer = d.createElement('div'); layer.className = 'scene'; layer.setAttribute('aria-hidden', 'true');
  stage.appendChild(layer);
  rows.forEach(function (r) { r.style.opacity = '0'; });
  count.style.opacity = '0';
  // строки IG и Telegram сначала «без ответа»
  var alertRows = rows.filter(function (r) { return r.dataset.ch === 'ig' || r.dataset.ch === 'tg'; });
  alertRows.forEach(function (r) { var t = $('.tag', r); t.textContent = 'без ответа'; t.className = 'tag tag--alert'; });

  var web = $('#msg-web').content.firstElementChild;
  var srcs = rows.concat([web]);
  var cw = rows[0].getBoundingClientRect().width;
  // хаос: смещение x, доля высоты y, поворот, направление влета круга, изгиб траектории
  var chaos = [[-46, 0.03, -7, [-1.1, -0.5], 90], [52, 0.25, 5, [1.2, -0.7], -110], [-30, 0.5, 4, [-1.2, 0.7], 100], [38, 0.68, -5, [1.1, 0.9], -90]];
  var cards = srcs.map(function (src, i) {
    var c = src.cloneNode(true), k = chaos[i];
    c.classList.add('scene__card'); c.style.width = cw + 'px';
    if (src === web) c.classList.add('scene__card--new');
    var sh = d.createElement('span'); sh.className = 'scene__shadow'; c.appendChild(sh);
    layer.appendChild(c);
    var h = c.offsetHeight;
    var x = (SW - cw) / 2 + k[0], y = Math.min(k[1] * SH, SH - h);
    var dot = d.createElement('span');
    dot.className = 'scene__dot'; dot.style.background = src === web ? '#E79532' : (i ? '#1C6A5C' : '#1B695B');
    layer.appendChild(dot);
    var cx = x + cw / 2 - 28 + (i % 2 ? 70 : -70), cy = y + h / 2 - 28;
    var sx = cx + k[3][0] * SW, sy = cy + k[3][1] * SH;
    // 0–0,65 с: круги влетают по дуге и чуть пружинят
    anim(dot, [
      { transform: tr(sx, sy, 0.5), opacity: 0 },
      { transform: tr((sx + cx) / 2 + k[4], (sy + cy) / 2 - k[4] * 0.6, 0.85), opacity: 1, offset: 0.45 },
      { transform: tr(cx, cy, 1.12), offset: 0.8 },
      { transform: tr(cx, cy, 1) }
    ], { duration: 650, delay: i * 55, easing: 'cubic-bezier(.3,.6,.4,1)' });
    // 0,6–1,35 с: круг «распускается», из него вырастает карточка
    anim(dot, [{ transform: tr(cx, cy, 1), opacity: 1 }, { transform: tr(cx, cy, 2.8), opacity: 0 }], { duration: 450, delay: 640 + i * 70, easing: OUT, fill: 'forwards' });
    var place = tr(x, y, 1, k[2]);
    anim(c, [
      { opacity: 0, transform: tr(cx - cw / 2 + 28, cy - h / 2 + 28, 0.2, 0) },
      { opacity: 1, offset: 0.35 },
      { opacity: 1, transform: place }
    ], { duration: 620, delay: 660 + i * 70, easing: SPRING });
    return { el: c, sh: sh, place: place, src: src, h: h, x: x, y: y, r: k[2] };
  });

  // 1,4 с: новая заявка приподнимается и летит в центр
  var nc = cards[3], centerY = (SH - nc.h) / 2, centerX = (SW - cw) / 2;
  anim(nc.el, [
    { transform: nc.place },
    { transform: tr(nc.x, nc.y - 10, 1.05, nc.r), offset: 0.3 },
    { transform: tr(centerX, centerY, 1.04) }
  ], { duration: 400, delay: 1380, easing: INOUT, fill: 'forwards' });
  // 1,78 с: «попадание» – волна, окно раскрывается с пружиной, карточка растворяется в нем
  var ring = d.createElement('span'); ring.className = 'scene__ring'; layer.appendChild(ring);
  var rc = tr(SW / 2, SH / 2);
  anim(ring, [{ transform: rc + ' scale(.3)', opacity: 0.9 }, { transform: rc + ' scale(3.4)', opacity: 0 }], { duration: 700, delay: 1780, easing: OUT, fill: 'forwards' });
  anim(nc.el, [{ opacity: 1, transform: tr(centerX, centerY, 1.04) }, { opacity: 0, transform: tr(centerX, centerY, 0.92) }], { duration: 280, delay: 1780, easing: OUT, fill: 'forwards' });
  var ia = anim(inbox, [{ opacity: 0, transform: 'scale(.86)' }, { opacity: 1, offset: 0.4 }, { opacity: 1, transform: 'none' }], { duration: 560, delay: 1760, easing: SPRING });
  ia.onfinish = function () { ia.cancel(); };
  inbox.style.opacity = '';
  // остальные карточки слетаются в список; поворот и тень плавно уходят
  cards.slice(0, 3).forEach(function (c, i) {
    var t = c.src.getBoundingClientRect(), to = tr(t.left - sr.left, t.top - sr.top, 1);
    var a = anim(c.el, [{ transform: c.place }, { transform: to }], { duration: 640, delay: 1800 + i * 80, easing: OUT, fill: 'forwards' });
    anim(c.sh, [{ opacity: 1 }, { opacity: 0 }], { duration: 640, delay: 1800 + i * 80, easing: OUT, fill: 'forwards' });
    a.onfinish = function () { c.src.style.opacity = ''; c.el.remove(); };
  });
  // 2,4–3 с: «без ответа» → ответственный, в шапке появляется счетчик
  alertRows.forEach(function (r, i) {
    at(2420 + i * 200, function () { swapTag($('.tag', r), r.dataset.assign, 'tag'); });
  });
  var ca = anim(count, [{ opacity: 0, transform: 'translateY(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 450, delay: 2500, easing: OUT });
  ca.onfinish = function () { ca.cancel(); };
  count.style.opacity = '';
  at(3000, function () { layer.remove(); startLoop(); });
}

/* метка плавно гаснет и появляется с новым текстом */
function swapTag(t, text, cls) {
  var a = anim(t, [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.7)' }], { duration: 160, easing: 'ease-in', fill: 'forwards' });
  a.onfinish = function () {
    t.textContent = text; t.className = cls; a.cancel();
    anim(t, [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: SPRING, fill: 'none' });
  };
}

/* окно живет: новый диалог раз в 8–10 секунд; пауза, если вкладка скрыта или блок вне экрана */
function startLoop() {
  var rows = $$('.msg', list), GAP = 10;
  var pool = [$('#msg-web').content.firstElementChild.cloneNode(true)];
  var inView = true, timer = 0;
  rows.forEach(function (r) { r._y = r.offsetTop; });
  list.style.height = list.offsetHeight + 'px';
  list.classList.add('is-live');
  rows.forEach(function (r) { r.style.transform = 'translate3d(0,' + r._y + 'px,0)'; });
  function layout(animate, incoming) {
    var y = 0;
    rows.forEach(function (r, i) {
      var from = r._y, inc = r === incoming;
      r._y = y; y += r.offsetHeight + GAP;
      r.style.transform = 'translate3d(0,' + r._y + 'px,0)';
      if (!animate) return;
      if (inc) anim(r, [{ transform: 'translate3d(0,' + (-r.offsetHeight * 0.6) + 'px,0) scale(.96)', opacity: 0 }, { opacity: 1, offset: 0.5 }, { transform: 'translate3d(0,0,0)', opacity: 1 }], { duration: 750, easing: SOFT, fill: 'none' });
      else anim(r, [{ transform: 'translate3d(0,' + from + 'px,0)' }, { transform: 'translate3d(0,' + r._y + 'px,0)' }], { duration: 750, delay: i * 40, easing: OUT, fill: 'backwards' });
    });
  }
  function schedule() { clearTimeout(timer); timer = later(cycle, 8000 + Math.random() * 2000); }
  function cycle() {
    if (!inView || d.hidden) { schedule(); return; }
    var inc = pool.shift(), out = rows.pop();
    var tag = $('.tag', inc), sec = 1;
    tag.className = 'tag tag--wait'; tag.textContent = 'ждет 1 с';
    list.insertBefore(inc, list.firstChild); rows.unshift(inc);
    var oa = anim(out, [{ transform: 'translate3d(0,' + out._y + 'px,0)', opacity: 1 }, { transform: 'translate3d(0,' + (out._y + 30) + 'px,0) scale(.97)', opacity: 0 }], { duration: 500, easing: OUT, fill: 'forwards' });
    oa.onfinish = function () { oa.cancel(); out.remove(); pool.push(out); };
    layout(true, inc);
    var tick = setInterval(function () {
      sec++;
      if (sec <= 4) { tag.textContent = 'ждет ' + sec + ' с'; return; }
      clearInterval(tick);
      swapTag(tag, inc.dataset.assign, 'tag');
    }, 1000);
    schedule();
  }
  if ('IntersectionObserver' in W) new IntersectionObserver(function (en) { inView = en[0].isIntersecting; }).observe(stage);
  var rt = 0;
  W.addEventListener('resize', function () { clearTimeout(rt); rt = later(function () { list.style.height = ''; layout(false); list.style.height = Math.max.apply(null, rows.map(function (r) { return r._y + r.offsetHeight; })) + 'px'; }, 150); });
  schedule();
}

})();
