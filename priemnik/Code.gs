/**
 * Atava CRM – приёмник заявок с сайта.
 * Каждая заявка сначала записывается строкой в таблицу, затем уходит письмом.
 * Если письмо не ушло, строка в таблице всё равно остаётся.
 *
 * Настройки – три строки ниже.
 */
var EMAIL_TO   = '[EMAIL ДЛЯ ЗАЯВОК]';   // куда присылать письма, можно несколько через запятую
var SITE_URL   = 'https://[ДОМЕН]';      // адрес сайта без слеша в конце
var SHEET_NAME = 'Заявки';               // имя листа в таблице

var HEADERS = ['Дата и время', 'Имя', 'Телефон', 'Удобное время', 'Отрасль', 'Тариф', 'Страница',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
  'Источник перехода', 'Статус'];

/** Запустите один раз вручную: создаст лист с заголовками и попросит разрешения на таблицу и почту. */
function setup() {
  var sh = getSheet_();
  SpreadsheetApp.getActive().setSpreadsheetTimeZone('Asia/Bishkek');
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  MailApp.getRemainingDailyQuota();
}

/** Проверка, что приёмник жив: откройте адрес веб-приложения в браузере. */
function doGet() {
  return ContentService.createTextOutput('Atava: приёмник заявок работает');
}

function doPost(e) {
  var p = (e && e.parameter) || {};
  var ajax = p.ajax === '1';

  // Защита от спама: заполненное скрытое поле – тихо отвечаем «успех», ничего не пишем
  if (p.website) return reply_(ajax, true);
  // Слишком быстрая отправка (меньше 3 секунд после загрузки страницы)
  if (p.elapsed && Number(p.elapsed) < 3000) return reply_(ajax, false);

  var lead = {
    name: clean_(p.name, 100),
    phone: normPhone_(p.phone || ''),
    call_time: clean_(p.call_time, 120),
    industry: clean_(p.industry, 80),
    plan: clean_(p.plan, 40),
    page: clean_(p.page, 300),
    utm_source: clean_(p.utm_source, 150),
    utm_medium: clean_(p.utm_medium, 150),
    utm_campaign: clean_(p.utm_campaign, 150),
    utm_content: clean_(p.utm_content, 150),
    utm_term: clean_(p.utm_term, 150),
    referrer: clean_(p.referrer, 300)
  };
  if (!lead.name || lead.phone.replace(/\D/g, '').length < 9) return reply_(ajax, false);
  lead.time = Utilities.formatDate(new Date(), 'Asia/Bishkek', 'yyyy-MM-dd HH:mm:ss');

  // 1. Таблица
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    getSheet_().appendRow([lead.time, lead.name, lead.phone, lead.call_time, lead.industry, lead.plan, lead.page,
      lead.utm_source, lead.utm_medium, lead.utm_campaign, lead.utm_content, lead.utm_term,
      lead.referrer, ''].map(safeCell_));
  } catch (err) {
    console.error('Не удалось записать в таблицу: ' + err);
    return reply_(ajax, false);
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }

  // 2. Письмо (ошибка письма не отменяет заявку)
  try { sendMail_(lead); } catch (err) { console.error('Письмо не отправлено: ' + err); }

  return reply_(ajax, true);
}

function sendMail_(l) {
  if (!EMAIL_TO || EMAIL_TO.indexOf('[') === 0) return;
  var digits = l.phone.replace(/\D/g, '');
  var subject = 'Заявка на демо Atava: ' + l.name + (l.industry ? ', ' + l.industry : '');
  var rows = [
    ['Дата и время', l.time + ' (Бишкек)'],
    ['Имя', l.name],
    ['Телефон', '<a href="tel:+' + digits + '">' + esc_(l.phone) + '</a> · <a href="https://wa.me/' + digits + '">написать в WhatsApp</a>'],
    ['Удобное время', l.call_time], ['Отрасль', l.industry], ['Тариф', l.plan], ['Страница', l.page],
    ['utm_source', l.utm_source], ['utm_medium', l.utm_medium], ['utm_campaign', l.utm_campaign],
    ['utm_content', l.utm_content], ['utm_term', l.utm_term], ['Источник перехода', l.referrer]
  ];
  var html = '<table cellpadding="6" style="border-collapse:collapse;font:14px Arial,sans-serif">' +
    rows.map(function (r) {
      var v = r[0] === 'Телефон' ? r[1] : esc_(r[1] || '–');
      return '<tr><td style="color:#56606E">' + r[0] + '</td><td><b>' + v + '</b></td></tr>';
    }).join('') + '</table>';
  var text = rows.map(function (r) { return r[0] + ': ' + (r[0] === 'Телефон' ? l.phone + ' (WhatsApp: https://wa.me/' + digits + ')' : (r[1] || '–')); }).join('\n');
  MailApp.sendEmail({ to: EMAIL_TO, subject: subject, body: text, htmlBody: html, name: 'Сайт Atava CRM' });
}

function reply_(ajax, ok) {
  if (ajax) {
    return ContentService.createTextOutput(JSON.stringify({ ok: ok })).setMimeType(ContentService.MimeType.JSON);
  }
  // Отправка без JavaScript: показываем простую страницу со ссылкой обратно на сайт
  var msg = ok
    ? '<h1>Спасибо! Заявка принята</h1><p>Перезвоним в течение рабочего часа.</p>'
    : '<h1>Не удалось отправить</h1><p>Проверьте имя и телефон и попробуйте ещё раз или напишите нам на hello@atava.kg.</p>';
  return HtmlService.createHtmlOutput('<div style="font:18px Arial,sans-serif;max-width:560px;margin:60px auto;padding:0 16px">' + msg +
    '<p><a href="' + SITE_URL + (ok ? '/spasibo/' : '/') + '" target="_top">Вернуться на сайт Atava</a></p></div>')
    .setTitle('Atava CRM');
}

function getSheet_() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  return sh;
}

function normPhone_(v) {
  var n = String(v).replace(/\D/g, '');
  if (n.indexOf('00') === 0) n = n.slice(2);
  if (n.length === 9) n = '996' + n;
  else if (n.length === 10 && n.charAt(0) === '0') n = '996' + n.slice(1);
  return n ? '+' + n : '';
}
function clean_(v, max) { return String(v || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, max); }
/** Защита от формул в ячейках: значение, начинающееся с = + - @, записывается как текст. */
function safeCell_(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function esc_(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
