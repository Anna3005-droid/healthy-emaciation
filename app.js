(function () {
  // Налаштування марафону
  var DAYS = 35, WORKOUTS = 24, COMPLEXES = 24, GLASS = 250;
  // Графік: 2 дні тренування, 1 день вихідний
  function isRest(i) { return i % 3 === 2; }
  function planNo(i) { return isRest(i) ? null : i - Math.floor(i / 3) + 1; }
  var PLANS = ['1300', '1450', '1600', '1900'];
  var MEALS = ['Сніданок', 'Перекус', 'Обід', 'Вечеря'];
  var KINDS = ['Силове', 'Кардіо', 'Ходьба', 'Розтяжка', 'Інше'];
  var KEY = 'marathon35-v1';

  var S, tab = 'today', cur = 0, q = '', fMeal = '', VIEW = null;
  var RECIPES = [], me = null, pendingName = '', saveTimer = null, writing = false, again = false;

  function $(id) { return document.getElementById(id); }
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 13.6 10.4 22 12 13.6 13.6 12 22 10.4 13.6 2 12 10.4 10.4Z" fill="none" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';
  var DOTS = '<i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>';
  function frame(inner) { return '<div class="sheet-frame"><span class="notch">' + STAR + '</span><span class="dots l" aria-hidden="true">' + DOTS + '</span><span class="dots r" aria-hidden="true">' + DOTS + '</span><div class="inner">' + inner + '</div></div>'; }
  function esc(v) { return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function blankDay() { return { wk: 0, kind: '', min: '', cx: '', steps: '', water: 0, meals: [0, 0, 0, 0], pick: ['', '', '', ''], weight: '', note: '' }; }
  function blank() { var d = []; for (var i = 0; i < DAYS; i++) d.push(blankDay()); return { reg: null, days: d }; }
  function valid(o) { if (!o || !o.days || !o.days.length) return false; while (o.days.length < DAYS) o.days.push(blankDay()); return true; }
  function D() { return VIEW ? VIEW.s : S; }
  function goal(s) { var r = (s || D()).reg; return r && Number(r.water) > 0 ? Number(r.water) : 2000; }
  function plan(s) { var r = (s || D()).reg; return r ? r.plan : ''; }
  function dis() { return VIEW ? ' disabled' : ''; }

  // Дату старту кожна учасниця вказує сама в анкеті; без неї трекер працює просто з номерами днів
  function startOf(s) { var r = (s || D()).reg; return r && /^\d{4}-\d{2}-\d{2}$/.test(r.start || '') ? r.start : ''; }
  function dayDate(i, s) { var st = startOf(s); if (!st) return null; var d = new Date(st + 'T00:00:00'); d.setDate(d.getDate() + i); return d; }
  function todayIdx(s) { var st = startOf(s); if (!st) return null; var t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((t - new Date(st + 'T00:00:00')) / 864e5); }
  function curDay(s) { var t = todayIdx(s); if (t == null) { var last = 0; (s || D()).days.forEach(function (d, i) { if (d.wk || d.water || Number(d.steps) || d.meals.some(Boolean)) last = i; }); return last; } return Math.max(0, Math.min(DAYS - 1, t)); }
  function fmt(d, o) { return d.toLocaleDateString('uk-UA', o || { day: 'numeric', month: 'short' }).replace('.', ''); }

  

  function marks(d) {
    return '<i class="' + (d.wk ? 'w' : '') + '"></i><i class="' + (d.water >= goal() ? 'a' : '') + '"></i><i class="' + (d.meals.filter(Boolean).length >= 3 ? 'f' : '') + '"></i>';
  }

  // ---------- Сьогодні ----------
  function renderToday() {
    var s = D(), d = s.days[cur], g = goal(), ti = todayIdx(), h = '';
    if (!s.reg && !VIEW) h += '<div class="banner"><p><b>Заповніть анкету учасниці</b>, щоб трекер знав вашу норму води й порції у рецептах.</p><button class="ghost" type="button" data-go="reg">Заповнити анкету</button></div>';
    h += '<div class="days" id="days">' + s.days.map(function (x, i) {
      return '<button class="day' + (i === ti ? ' today' : '') + (isRest(i) ? ' rest' : '') + '" type="button" data-day="' + i + '" aria-pressed="' + (i === cur) + '" aria-label="День ' + (i + 1) + (isRest(i) ? ', вихідний' : ', тренування') + '"><b>' + (i + 1) + '</b><small>' + (i === ti ? 'сьогодні' : isRest(i) ? 'вихідний' : dayDate(i) ? fmt(dayDate(i)) : '&nbsp;') + '</small><span class="marks">' + marks(x) + '</span></button>';
    }).join('') + '</div>';
    var sub = ti == null ? (VIEW ? 'Дату старту не вказано' : 'Вкажіть дату старту в анкеті, і тут з’являться дати') : ti < 0 ? 'Старт ' + fmt(dayDate(0), { day: 'numeric', month: 'long' }) + ', до початку ' + (-ti) + ' ' + plural(-ti, 'день', 'дні', 'днів') : fmt(dayDate(cur), { weekday: 'long', day: 'numeric', month: 'long' });
    var plan0 = planNo(cur);
    sub += '<br><span class="plan-line">' + (plan0 ? 'За планом тренування ' + plan0 + ' з ' + WORKOUTS : 'За планом вихідний від тренування. Вода, кроки й харчування як завжди') + '</span>';
    h += frame('<div class="dayhead"><div class="eyebrow">Марафон</div><h2>День ' + (cur + 1) + ' <em>з ' + DAYS + '</em></h2><p>' + sub + '</p></div>');
    h += '<div class="stack">';

    var n = Math.max(8, Math.ceil(g / GLASS)), filled = Math.round(d.water / GLASS);
    h += '<div class="card water"><div class="head"><h3>Вода</h3><span class="big" id="w-big">' + (d.water / 1000).toFixed(2).replace('.', ',') + ' <small>з ' + (g / 1000).toFixed(1).replace('.', ',') + ' л</small></span></div>' +
      '<div class="glasses">' + Array.from({ length: n }, function (_, k) {
        return '<button class="glass" type="button" data-glass="' + k + '" aria-label="Склянка ' + (k + 1) + ', ' + GLASS + ' мл" aria-pressed="' + (k < filled) + '"' + dis() + '></button>';
      }).join('') + '</div><div class="bar"><i id="w-bar" style="width:' + Math.min(100, d.water / g * 100).toFixed(0) + '%"></i></div>' +
      '<div class="row"><span class="note" style="margin:0">Одна склянка = ' + GLASS + ' мл.</span>' + (VIEW ? '' : '<button class="ghost" type="button" data-water="-' + GLASS + '">−250 мл</button><button class="ghost" type="button" data-water="500">+0,5 л пляшка</button>') + '</div></div>';

    var wkDone = s.days.filter(function (x) { return x.wk; }).length;
    h += '<div class="card work"><div class="head"><h3>Тренування</h3><span class="big">' + wkDone + ' <small>з ' + WORKOUTS + ' за марафон</small></span></div>' +
      (plan0 ? '' : '<p class="note" style="margin:0 0 10px">Сьогодні вихідний тільки від тренування. Якщо все ж позаймалися, відмітьте нижче.</p>') +
      '<button class="toggle" type="button" id="wk" aria-pressed="' + !!d.wk + '"' + dis() + '><span class="box"></span><span>Тренування виконано<small>' + (d.wk ? 'Чудово, тренування зараховано' : 'Натисніть, коли позаймалися') + '</small></span></button>' +
      '<label class="f" for="d-cx" style="margin-top:12px">Який комплекс робили<select id="d-cx" data-cx="1"' + dis() + '><option value="">' + (plan0 ? 'За планом: Комплекс ' + plan0 : 'Оберіть комплекс') + '</option>' + Array.from({ length: COMPLEXES }, function (_, k) { return '<option value="' + (k + 1) + '"' + (String(d.cx) === String(k + 1) ? ' selected' : '') + '>Комплекс ' + (k + 1) + '</option>'; }).join('') + '</select></label>' +
      '<div class="grid2"><div><h3 style="margin:4px 0 8px">Що робили</h3><div class="seg">' + KINDS.map(function (k) { return '<button type="button" data-kind="' + k + '" aria-pressed="' + (d.kind === k) + '"' + dis() + '>' + k + '</button>'; }).join('') + '</div></div>' +
      '<label class="f" for="d-min">Хвилин<input type="number" inputmode="numeric" min="0" id="d-min" data-bind="min" value="' + esc(d.min) + '" placeholder="30"' + dis() + '></label></div></div>';
    h += '<div class="card steps"><div class="head"><h3>Кроки</h3><span class="big" id="st-big">' + (Number(d.steps) ? Number(d.steps).toLocaleString('uk-UA') : '0') + ' <small>кроків</small></span></div>' +
      '<label class="f" for="d-steps">Скільки кроків пройшли за день<input type="number" inputmode="numeric" min="0" step="100" id="d-steps" data-bind="steps" value="' + esc(d.steps) + '" placeholder="Наприклад, 8000"' + dis() + '></label>' +
      '<p class="note" style="margin:8px 0 0">Подивіться в застосунку на телефоні (Google Fit, Samsung Health, «Здоров’я» на iPhone) або у фітнес-браслеті й перепишіть число сюди ввечері.</p></div>';

    h += '<div class="card food"><div class="head"><h3>Харчування</h3><span class="note" style="margin:0">' + (plan() ? 'План ' + plan() + ' ккал' : 'План не обрано') + '</span></div><div class="meals">' + MEALS.map(function (m, k) {
      var opts = RECIPES.map(function (r, ri) { return r.m.indexOf(m) === 0 ? '<option value="' + ri + '"' + (String(d.pick[k]) === String(ri) ? ' selected' : '') + '>' + esc(r.t) + '</option>' : ''; }).join('');
      var isOwn = d.pick[k] === 'own', ow = (d.own && d.own[k]) || {};
      var pr = d.pick[k] !== '' && !isOwn ? RECIPES[d.pick[k]] : null;
      var ownF = function (f, label, ph, mode) { return '<label class="f" for="o-' + k + '-' + f + '">' + label + '<input type="' + (f === 'name' ? 'text' : 'number') + '"' + (mode ? ' inputmode="' + mode + '" min="0"' : '') + ' id="o-' + k + '-' + f + '" data-own="' + k + '" data-of="' + f + '" value="' + esc(ow[f] || '') + '" placeholder="' + ph + '"' + dis() + '></label>'; };
      var ownBox = isOwn ? '<div class="own"><p class="note">Опишіть, що з’їли: назва, вага порції і калорійність. Калорійність можна подивитися на упаковці або в застосунку для підрахунку калорій.</p>' +
        ownF('name', 'Що за страва', 'Наприклад, гречка з куркою') +
        '<div class="ownrow">' + ownF('g', 'Вага, г', '250', 'numeric') + ownF('kcal', 'Ккал', '320', 'numeric') + '</div>' +
        '<div class="ownrow ownrow3">' + ownF('p', 'Білки, г', '25', 'decimal') + ownF('f', 'Жири, г', '8', 'decimal') + ownF('c', 'Вуглеводи, г', '35', 'decimal') + '</div></div>' : '';
      return '<div class="meal"><input type="checkbox" id="m-' + k + '" data-meal="' + k + '"' + (d.meals[k] ? ' checked' : '') + dis() + ' aria-label="' + m + ' з’їдено">' +
        '<div class="mt"><b>' + m + (pr ? ' · ' + esc(portionFor(pr)) : '') + (isOwn && Number(ow.kcal) ? ' · ' + Number(ow.kcal) + ' ккал' : '') + '</b><select id="p-' + k + '" data-pick="' + k + '" aria-label="Страва на ' + m.toLowerCase() + '"' + dis() + '><option value="">Оберіть страву з книги</option><option value="own"' + (isOwn ? ' selected' : '') + '>Своя страва, не з книги</option>' + opts + '</select>' + ownBox + '</div>' +
        (pr ? '<button class="ghost open" type="button" data-recipe="' + d.pick[k] + '">Рецепт</button>' : '') + '</div>';
    }).join('') + '</div></div>';

    h += '<div class="card"><div class="grid2" style="margin-top:0"><label class="f" for="d-weight">Вага зранку, кг<input type="number" inputmode="decimal" step="0.1" id="d-weight" data-bind="weight" value="' + esc(d.weight) + '" placeholder="необов’язково"' + dis() + '></label>' +
      '<label class="f" for="d-note">Нотатка дня<input type="text" id="d-note" data-bind="note" value="' + esc(d.note) + '" placeholder="Самопочуття, сон, настрій"' + dis() + '></label></div></div>';
    h += '</div>';
    $('today').innerHTML = h;
    var c = document.querySelector('.day[aria-pressed="true"]'), box = $('days');
    if (c && box) box.scrollLeft = Math.max(0, c.offsetLeft - 60);
  }
  function plural(n, a, b, c) { var m = n % 10, mm = n % 100; return m === 1 && mm !== 11 ? a : m >= 2 && m <= 4 && (mm < 12 || mm > 14) ? b : c; }
  function portionFor(r) {
    var p = plan(); if (!p) return '';
    var x = r.p.filter(function (y) { return y[0] === p; })[0];
    return x ? x[1].split('+')[0].trim() : '';
  }

  // ---------- Рецепти ----------
  var CATS = ['Сніданок', 'Перекус', 'Обід', 'Вечеря', 'Додатки'];
  function renderRecipes() {
    var h = '<h2>Книга <em>рецептів</em></h2><p class="note">' + RECIPES.length + ' страв марафону. ' + (plan() ? 'Порції показані для вашого плану ' + plan() + ' ккал.' : 'Оберіть план калорій в анкеті, і ваша порція підсвітиться.') + '</p>';
    h += '<div class="filters"><input type="search" id="rq" placeholder="Пошук: гарбуз, творог, курка…" value="' + esc(q) + '" aria-label="Пошук рецепта">' +
      '<div class="seg green">' + [''].concat(CATS).map(function (c) { return '<button type="button" data-cat="' + c + '" aria-pressed="' + (fMeal === c) + '">' + (c || 'Усі') + '</button>'; }).join('') + '</div></div>';
    h += '<p class="count" id="rcount"></p><div class="rlist" id="rlist"></div>';
    $('recipes').innerHTML = h; renderList();
  }
  function renderList() {
    var t = q.trim().toLowerCase(), out = [];
    RECIPES.forEach(function (r, i) {
      if (fMeal && r.s !== fMeal) return;
      if (t && (r.t + ' ' + r.ing.join(' ')).toLowerCase().indexOf(t) < 0) return;
      out.push('<button class="rc" type="button" data-recipe="' + i + '"><b>' + esc(r.t) + '</b><span><span class="tag">' + esc(r.m || r.s) + '</span>' + (portionFor(r) ? ' · ваша порція ' + esc(portionFor(r)) : '') + '</span></button>');
    });
    $('rlist').innerHTML = out.join('') || '<div class="empty">Нічого не знайшлося. Спробуйте інше слово.</div>';
    $('rcount').textContent = 'Знайдено: ' + out.length;
  }
  function openRecipe(i) {
    var r = RECIPES[i], p = plan(), h = '';
    h += '<button class="ghost x" type="button" data-close>Закрити</button><span class="tag">' + esc(r.m || r.s) + '</span><h2 id="dlg-title" style="margin-top:8px">' + esc(r.t) + '</h2>';
    if (r.k) h += '<div class="kbju"><span><b>' + (r.k['К'] || '-') + '</b>ккал / 100 г</span><span><b>' + (r.k['Б'] || '-') + '</b>білки</span><span><b>' + (r.k['Ж'] || '-') + '</b>жири</span><span><b>' + (r.k['В'] || '-') + '</b>вуглеводи</span></div>';
    if (r.p.length) h += '<h3>Порція за планом</h3><div class="portions">' + r.p.map(function (x) { return '<div class="' + (x[0] === p ? 'mine' : '') + '"><b>' + x[0] + ' ккал' + (x[0] === p ? ' · ваш' : '') + '</b>' + esc(x[1]) + '</div>'; }).join('') + '</div>';
    if (r.n.length) h += '<p class="extra">' + r.n.map(esc).join('<br>') + '</p>';
    if (r.ing.length) h += '<h3>Інгредієнти</h3><ul>' + r.ing.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    if (r.st.length) h += '<h3>Приготування</h3><ol>' + r.st.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>';
    $('dlg-body').innerHTML = h;
    var dl = $('dlg'); if (dl.showModal) dl.showModal(); else dl.setAttribute('open', '');
  }

  // ---------- Прогрес ----------
  function stats(s) {
    var g = goal(s), ti = Math.min(DAYS, Math.max(0, curDay(s) + 1));
    var wk = s.days.filter(function (d) { return d.wk; }).length;
    var wOk = s.days.filter(function (d) { return d.water >= g; }).length;
    var mins = s.days.reduce(function (a, d) { return a + (Number(d.min) || 0); }, 0);
    var waterTot = s.days.reduce(function (a, d) { return a + d.water; }, 0);
    var ws = s.days.map(function (d) { return Number(d.weight) || null; }).filter(Boolean);
    var w0 = Number(s.reg && s.reg.w0) || ws[0] || null, wl = ws.length ? ws[ws.length - 1] : null;
    var food = s.days.filter(function (d) { return d.meals.filter(Boolean).length >= 3; }).length;
    var streak = 0; for (var i = Math.min(DAYS, Math.max(1, ti)) - 1; i >= 0; i--) { if (s.days[i].wk) streak++; else break; }
    var touched = s.days.filter(function (d) { return d.wk || d.water || d.meals.some(Boolean) || d.weight || Number(d.steps); }).length;
    var sd = s.days.map(function (d) { return Number(d.steps) || 0; }).filter(Boolean);
    var stepsTot = sd.reduce(function (a, b) { return a + b; }, 0), stepsAvg = sd.length ? Math.round(stepsTot / sd.length) : 0;
    var lastCx = ''; s.days.forEach(function (d) { if (d.wk && d.cx) lastCx = d.cx; });
    return { stepsTot: stepsTot, stepsAvg: stepsAvg, lastCx: lastCx, wk: wk, wOk: wOk, mins: mins, waterTot: waterTot, w0: w0, wl: wl, food: food, streak: streak, touched: touched };
  }
  function renderProgress() {
    var s = D(), st = stats(s), g = goal(s), h = '';
    h += '<h2>Мій <em>прогрес</em></h2><p class="note">Усе рахується з ваших щоденних відміток. Натисніть на день, щоб відкрити його.</p>';
    var dw = st.w0 && st.wl ? (st.wl - st.w0) : null;
    h += '<div class="kpis">' +
      '<div class="kpi"><span>Тренувань</span><b>' + st.wk + ' <small>з ' + WORKOUTS + '</small></b></div>' +
      '<div class="kpi"><span>Серія тренувань</span><b>' + st.streak + ' <small>' + plural(st.streak, 'день', 'дні', 'днів') + '</small></b></div>' +
      '<div class="kpi"><span>Норма води</span><b>' + st.wOk + ' <small>' + plural(st.wOk, 'день', 'дні', 'днів') + '</small></b></div>' +
      '<div class="kpi"><span>Хвилин руху</span><b>' + st.mins + '</b></div>' +
      '<div class="kpi"><span>Кроків у середньому</span><b>' + st.stepsAvg.toLocaleString('uk-UA') + ' <small>на день</small></b></div>' +
      '<div class="kpi"><span>Вага</span><b>' + (dw == null ? '-' : (dw > 0 ? '+' : '') + dw.toFixed(1).replace('.', ',') + ' <small>кг</small>') + '</b></div></div>';
    h += '<div class="card" style="margin-bottom:14px"><h3>' + DAYS + ' днів</h3><div class="heat">' + s.days.map(function (d, i) {
      return '<button class="cell" type="button" data-cell="' + i + '" aria-label="День ' + (i + 1) + '"><span>' + (i + 1) + '</span><span class="m">' + marks(d) + '</span></button>';
    }).join('') + '</div><div class="legend"><span><i style="background:var(--rose)"></i>тренування</span><span><i style="background:var(--water)"></i>норма води</span><span><i style="background:var(--sage)"></i>3+ прийоми їжі за планом</span></div></div>';
    var top = Math.max(g * 1.25, Math.max.apply(null, s.days.map(function (d) { return d.water; })));
    h += '<div class="card"><h3>Вода по днях, л</h3><div class="chart">' + s.days.map(function (d, i) {
      return '<i title="День ' + (i + 1) + ': ' + (d.water / 1000).toFixed(2) + ' л" style="height:' + (d.water / top * 100).toFixed(1) + '%"></i>';
    }).join('') + '<div class="goal" style="bottom:' + (g / top * 100).toFixed(1) + '%"><span>норма ' + (g / 1000).toFixed(1).replace('.', ',') + ' л</span></div></div><div class="axis"><span>день 1</span><span>день ' + DAYS + '</span></div></div>';
    $('progress').innerHTML = h;
  }

  // ---------- Анкета ----------
  var draft = null;
  function renderReg() {
    var r = draft || S.reg || { name: pendingName || '', contact: '', start: '', plan: '', w0: '', wGoal: '', height: '', water: '', why: '' };
    draft = JSON.parse(JSON.stringify(r));
    var h = '';
    h += '<div class="card reg stack">' + '<div><h2>' + (S.reg ? 'Моя <em>анкета</em>' : 'Анкета <em>учасниці</em>') + '</h2><p class="hello">Вітаємо в марафоні! <b>' + DAYS + ' днів</b>, <b>' + WORKOUTS + ' тренування</b>, вода, кроки й смачні рецепти. Крок за кроком ти станеш кращою версією себе.</p></div>' +
      '<div class="grid2" style="margin-top:0"><label class="f" for="r-name">Ім’я та прізвище<input type="text" id="r-name" data-r="name" value="' + esc(r.name) + '" autocomplete="name" placeholder="Олена Коваль"></label>' +
      '<label class="f" for="r-contact">Телефон або Instagram<input type="text" id="r-contact" data-r="contact" value="' + esc(r.contact) + '" placeholder="@nickname"></label></div>' +
      '<div><h3>План калорій</h3><div class="plans">' + PLANS.map(function (p) { return '<button class="plan" type="button" data-plan="' + p + '" aria-pressed="' + (r.plan === p) + '"><b>' + p + '</b><span>ккал на день</span></button>'; }).join('') + '</div></div>' +
      '<label class="f" for="r-start">Дата старту марафону<input type="date" id="r-start" data-r="start" value="' + esc(r.start || '') + '"><span style="font-weight:400">Від неї рахуються дні. Можна вказати пізніше.</span></label>' +
      '<div class="grid2" style="margin-top:0"><label class="f" for="r-w0">Вага на старті, кг<input type="number" inputmode="decimal" step="0.1" id="r-w0" data-r="w0" value="' + esc(r.w0) + '" placeholder="68"></label>' +
      '<label class="f" for="r-goal">Бажана вага, кг<input type="number" inputmode="decimal" step="0.1" id="r-goal" data-r="wGoal" value="' + esc(r.wGoal) + '" placeholder="62"></label>' +
      '<label class="f" for="r-h">Зріст, см<input type="number" inputmode="numeric" id="r-h" data-r="height" value="' + esc(r.height) + '" placeholder="165"></label>' +
      '<label class="f" for="r-water">Норма води, мл<input type="number" inputmode="numeric" step="50" id="r-water" data-r="water" value="' + esc(r.water) + '" placeholder="' + (Number(r.w0) ? Math.round(r.w0 * 30 / 50) * 50 : 2000) + '"></label></div>' +
      '<label class="f" for="r-why">Яка ваша ціль на марафон<textarea id="r-why" data-r="why" placeholder="Наприклад: звикнути до тренувань і пити достатньо води">' + esc(r.why) + '</textarea></label>' +
      '<p class="err" id="r-err"></p><button class="cta" type="button" id="r-save">' + (S.reg ? 'Зберегти зміни' : 'Зберегти анкету') + '</button></div>';
    $('reg').innerHTML = h;
  }
  function saveReg() {
    var r = draft;
    if (!r.name.trim()) { $('r-err').textContent = 'Вкажіть ім’я, щоб організаторка знала, чий це трекер.'; return; }
    if (!r.plan) { $('r-err').textContent = 'Оберіть план калорій: від нього залежать порції в рецептах.'; return; }
    if (!Number(r.water)) r.water = Number(r.w0) ? Math.round(r.w0 * 30 / 50) * 50 : 2000;
    var first = !S.reg; S.reg = JSON.parse(JSON.stringify(r)); S.reg.at = S.reg.at || new Date().toISOString();
    draft = null; touch(); paintWho();
    show(first ? 'today' : 'reg');
    if (!first) $('r-err').textContent = 'Збережено.';
  }

  // ---------- Каркас ----------
  function paintWho() { var r = D().reg; $('who').textContent = r ? r.name + ' · ' + r.plan + ' ккал' : ''; }
  function render() {
    paintWho();
    if (tab === 'today') renderToday(); else if (tab === 'recipes') renderRecipes(); else if (tab === 'progress') renderProgress(); else renderReg();
  }
  function show(t) {
    tab = t;
    document.querySelectorAll('.tab').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.tab === t ? 'true' : 'false'); });
    ['today', 'recipes', 'progress', 'reg'].forEach(function (id) { $(id).hidden = id !== t; });
    screen('app');
    render(); window.scrollTo(0, 0); enter(t);
  }
  var enterTimer = null;
  function enter(id) {
    var el = $(id); if (!el) return;
    el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter');
    el.querySelectorAll('.rlist > *').forEach(function (c, i) { if (i < 12) c.style.setProperty('--i', i); });
    clearTimeout(enterTimer); enterTimer = setTimeout(function () { el.classList.remove('enter'); }, 900);
  }
  var RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function burst(el, color) {
    if (RM || !el) return;
    var r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    for (var k = 0; k < 9; k++) {
      var a = k / 9 * Math.PI * 2 + Math.random() * .4, d = 46 + Math.random() * 40, s = document.createElement('span');
      s.className = 'spark';
      s.style.left = cx + 'px'; s.style.top = cy + 'px';
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.animationDelay = (Math.random() * 80) + 'ms';
      s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 13.6 10.4 22 12 13.6 13.6 12 22 10.4 13.6 2 12 10.4 10.4Z" fill="' + (color || '#C99487') + '"/></svg>';
      document.body.appendChild(s);
      setTimeout(function (n) { return function () { n.remove(); }; }(s), 1000);
    }
  }
  // ---------- Події ----------
  function setWater(ml) {
    var d = S.days[cur], before = d.water; d.water = Math.max(0, ml); touch();
    var g = goal(), f = Math.round(d.water / GLASS);
    document.querySelectorAll('.glass').forEach(function (x) { x.setAttribute('aria-pressed', String(Number(x.dataset.glass) < f)); });
    $('w-big').innerHTML = (d.water / 1000).toFixed(2).replace('.', ',') + ' <small>з ' + (g / 1000).toFixed(1).replace('.', ',') + ' л</small>';
    $('w-bar').style.width = Math.min(100, d.water / g * 100).toFixed(0) + '%';
    var last = document.querySelector('.glass[data-glass="' + (f - 1) + '"]');
    if (last && d.water > before) { last.classList.remove('just'); void last.offsetWidth; last.classList.add('just'); }
    if (before < g && d.water >= g) burst($('w-big'), '#6F93AB');
    var m = document.querySelector('.day[data-day="' + cur + '"] .marks'); if (m) m.innerHTML = marks(d);
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.hasAttribute('data-close')) return $('dlg').close ? $('dlg').close() : $('dlg').removeAttribute('open');
    if (t.classList.contains('tab')) return show(t.dataset.tab);
    if (t.dataset.go) return show(t.dataset.go);
    if (t.dataset.recipe != null) return openRecipe(Number(t.dataset.recipe));
    if (t.dataset.day != null) { cur = Number(t.dataset.day); return renderToday(); }
    if (t.dataset.cell != null) { cur = Number(t.dataset.cell); return show('today'); }
    if (t.dataset.cat != null) { fMeal = t.dataset.cat; document.querySelectorAll('[data-cat]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.cat === fMeal)); }); return renderList(); }
    if (t.dataset.plan) { draft.plan = t.dataset.plan; document.querySelectorAll('.plan').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.plan === draft.plan)); }); return; }
    if (t.id === 'r-save') return saveReg();
    if (VIEW) return;
    var d = S.days[cur];
    if (t.dataset.glass != null) { var k = Number(t.dataset.glass), f = Math.round(d.water / GLASS); return setWater(k + 1 === f ? k * GLASS : (k + 1) * GLASS); }
    if (t.dataset.water) return setWater(d.water + Number(t.dataset.water));
    if (t.id === 'wk') { d.wk = d.wk ? 0 : 1; if (d.wk && !d.cx && planNo(cur)) d.cx = String(planNo(cur)); touch(); renderToday(); if (d.wk) burst($('wk').querySelector('.box')); return; }
    if (t.dataset.kind) { d.kind = d.kind === t.dataset.kind ? '' : t.dataset.kind; if (d.kind && !d.wk) d.wk = 1; touch(); return renderToday(); }
  });
  $('dlg').addEventListener('click', function (e) { if (e.target === $('dlg')) $('dlg').close(); });
  document.addEventListener('input', function (e) {
    var el = e.target;
    if (el.id === 'rq') { q = el.value; return renderList(); }
    if (el.dataset.r) { draft[el.dataset.r] = el.value; return; }
    if (el.dataset.own != null && !VIEW) { var dd = S.days[cur]; if (!dd.own) dd.own = [{}, {}, {}, {}]; dd.own[Number(el.dataset.own)][el.dataset.of] = el.value; touch(); return; }
    if (VIEW) return;
    if (el.dataset.bind) { S.days[cur][el.dataset.bind] = el.value; touch(); if (el.dataset.bind === 'steps' && $('st-big')) $('st-big').innerHTML = (Number(el.value) || 0).toLocaleString('uk-UA') + ' <small>кроків</small>'; }
  });
  document.addEventListener('change', function (e) {
    var el = e.target; if (VIEW) return;
    var d = S.days[cur];
    if (el.dataset.meal != null) { d.meals[Number(el.dataset.meal)] = el.checked ? 1 : 0; touch(); var m = document.querySelector('.day[data-day="' + cur + '"] .marks'); if (m) m.innerHTML = marks(d); }
    if (el.dataset.cx) { d.cx = el.value; if (d.cx && !d.wk) d.wk = 1; touch(); return renderToday(); }
    if (el.dataset.pick != null) { d.pick[Number(el.dataset.pick)] = el.value; touch(); renderToday(); }
  });
  // ---------- Збереження ----------
  // Трекер зберігається в акаунті (Supabase) і копією в браузері, щоб працював і без інтернету
  var cfg = window.TRACKER_CONFIG || {};
  var sb = window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.supabaseUrl.indexOf('ВАШ') < 0
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey) : null;
  function localKey() { return KEY + (me ? '-' + me.id : ''); }
  function loadMine() { try { var o = JSON.parse(localStorage.getItem(localKey()) || 'null'); return valid(o) ? o : null; } catch (e) { return null; } }
  // Відмітки, зроблені до появи входу з поштою, підхоплюються з цього пристрою
  function loadOld() { try { var o = JSON.parse(localStorage.getItem(KEY) || 'null'); return valid(o) ? o : null; } catch (e) { return null; } }
  function syncState(k, t) { $('sync').className = 'sync' + (k ? ' ' + k : ''); $('sync-text').textContent = t; }
  function touch() {
    try { localStorage.setItem(localKey(), JSON.stringify(S)); } catch (e) {}
    if (!sb || !me) return;
    syncState('on', 'Зберігаємо…'); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 900);
  }
  function flush() {
    if (writing) { again = true; return; }
    writing = true;
    sb.from('trackers').upsert({ user_id: me.id, data: S }).then(function (r) {
      writing = false;
      if (r.error) { syncState('err', 'Не вдалося зберегти. Перевірте інтернет, спробуємо ще раз'); setTimeout(flush, 4000); return; }
      syncState('on', 'Збережено');
      if (again) { again = false; flush(); }
    });
  }

  // ---------- Екрани ----------
  function screen(name) {
    $('loading').hidden = name !== 'loading';
    $('auth').hidden = name !== 'auth';
    $('recover').hidden = name !== 'recover';
    $('tabs').hidden = $('foot').hidden = name !== 'app';
    if (name !== 'app') { ['today', 'recipes', 'progress', 'reg'].forEach(function (id) { $(id).hidden = true; }); $('who').textContent = ''; }
  }

  // ---------- Вхід і реєстрація ----------
  var mode = 'login';
  function authMsg(t, kind) { var m = $('a-msg'); m.textContent = t || ''; m.style.color = kind === 'ok' ? 'var(--sage-ink)' : ''; }
  function setMode(m) {
    mode = m;
    $('a-login').setAttribute('aria-pressed', String(m !== 'signup'));
    $('a-signup').setAttribute('aria-pressed', String(m === 'signup'));
    $('a-name-wrap').hidden = m !== 'signup';
    $('a-pass-wrap').hidden = m === 'forgot';
    $('a-forgot').hidden = m !== 'login';
    $('a-pass').autocomplete = m === 'signup' ? 'new-password' : 'current-password';
    $('a-title').innerHTML = m === 'login' ? 'Вхід у <em>трекер</em>' : m === 'signup' ? 'Реєстрація на <em>марафон</em>' : 'Відновлення <em>пароля</em>';
    $('a-submit').textContent = m === 'login' ? 'Увійти' : m === 'signup' ? 'Зареєструватися' : 'Надіслати лист';
    authMsg(m === 'forgot' ? 'Вкажіть email, і ми надішлемо посилання для нового пароля.' : '', 'ok');
  }
  $('a-login').addEventListener('click', function () { setMode('login'); });
  $('a-signup').addEventListener('click', function () { setMode('signup'); });
  $('a-forgot').addEventListener('click', function () { setMode('forgot'); });
  function uaError(err) {
    var m = (err && err.message || '').toLowerCase();
    if (m.indexOf('invalid login') >= 0) return 'Неправильний email або пароль.';
    if (m.indexOf('already registered') >= 0 || m.indexOf('already been registered') >= 0) return 'Цей email уже зареєстрований. Перейдіть на вкладку «Вхід».';
    if (m.indexOf('password') >= 0 && m.indexOf('6') >= 0) return 'Пароль має бути не коротший за 6 символів.';
    if (m.indexOf('email not confirmed') >= 0) return 'Email ще не підтверджено. Перевірте пошту.';
    if (m.indexOf('rate limit') >= 0) return 'Забагато спроб. Зачекайте трохи й спробуйте знову.';
    if (m.indexOf('invalid') >= 0 && m.indexOf('email') >= 0) return 'Перевірте email: схоже, в ньому помилка.';
    return 'Не вийшло: ' + (err && err.message || 'невідома помилка');
  }
  $('auth-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var email = $('a-email').value.trim(), pass = $('a-pass').value, btn = $('a-submit');
    if (!email) return authMsg('Вкажіть email.');
    if (mode !== 'forgot' && pass.length < 6) return authMsg('Пароль має бути не коротший за 6 символів.');
    if (mode === 'signup' && !$('a-name').value.trim()) return authMsg('Напишіть, як вас звати.');
    btn.disabled = true; authMsg('Секунду…', 'ok');
    var p;
    if (mode === 'login') p = sb.auth.signInWithPassword({ email: email, password: pass });
    else if (mode === 'signup') { pendingName = $('a-name').value.trim(); p = sb.auth.signUp({ email: email, password: pass }); }
    else p = sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    p.then(function (r) {
      btn.disabled = false;
      if (r.error) return authMsg(uaError(r.error));
      if (mode === 'forgot') return authMsg('Готово. Перевірте пошту й перейдіть за посиланням з листа.', 'ok');
      if (mode === 'signup' && !r.data.session) return authMsg('Ми надіслали лист для підтвердження. Відкрийте його й поверніться сюди.', 'ok');
    });
  });
  $('rec-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var pass = $('rec-pass').value;
    if (pass.length < 6) { $('rec-msg').textContent = 'Пароль має бути не коротший за 6 символів.'; return; }
    sb.auth.updateUser({ password: pass }).then(function (r) {
      if (r.error) { $('rec-msg').textContent = uaError(r.error); return; }
      history.replaceState(null, '', location.pathname);
      sb.auth.getSession().then(function (s) { enterApp(s.data.session); });
    });
  });
  $('logout').addEventListener('click', function () { sb.auth.signOut(); });

  // ---------- Запуск ----------
  var recipesReady = fetch('recipes.json').then(function (r) { return r.json(); }).then(function (data) { RECIPES = data; }, function () {
    $('alert').innerHTML = '<div class="alert">Не вдалося завантажити рецепти. Перевірте інтернет і оновіть сторінку.</div>';
  });
  function enterApp(session) {
    if (!session) { me = null; S = null; screen('auth'); setMode('login'); return; }
    if (me && me.id === session.user.id && S) { screen('app'); return; }
    me = session.user; screen('loading');
    $('who-email').textContent = me.email;
    Promise.all([sb.from('trackers').select('data').eq('user_id', me.id).maybeSingle(), recipesReady]).then(function (r) {
      var row = r[0].data, local = loadMine() || loadOld();
      S = row && valid(row.data) ? row.data : local || blank();
      cur = curDay(S); draft = null;
      if (r[0].error) syncState('err', 'Не вдалося завантажити трекер. Оновіть сторінку');
      else syncState('on', row ? 'Збережено' : 'Готово');
      if (!row) flush();
      show(S.reg ? 'today' : 'reg');
    });
  }
  if (!sb) {
    screen('auth');
    $('auth-form').hidden = true;
    $('auth').querySelector('.auth-card').insertAdjacentHTML('beforeend', '<p class="err">Сайт ще не підключений до бази. Впишіть ключі Supabase у файл config.js.</p>');
    return;
  }
  sb.auth.onAuthStateChange(function (event, session) {
    if (event === 'PASSWORD_RECOVERY') { screen('recover'); return; }
    if (event === 'SIGNED_OUT') { enterApp(null); return; }
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
      // Supabase радить не робити запити прямо в цьому обробнику
      setTimeout(function () { if ($('recover').hidden) enterApp(session); }, 0);
    }
  });
})();
