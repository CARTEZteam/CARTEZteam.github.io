/* OBJECT STATUS: curated equipment-condition records + interface texts (EN / RU / KK).
 *
 * `o.condition` is a NEW field merged onto window.OBJECTS. The legacy `o.status` (left / active / ended / impact)
 * is not touched and keeps driving the old filter, colours and timeline.
 *
 * Rules (also in README):
 *  - Every state is assigned by hand with a stated reason and a source. It is NEVER derived from `status`,
 *    from the date of the last signal or from any other field.
 *  - "mission ended" is not "destroyed": Inactive records say so; physical damage is claimed only where a source says it.
 *  - Abandoned = hardware deliberately left / left behind on the surface. Never used for orbiting or working hardware.
 *  - No reliable record -> Unknown (also the fallback for any object without an entry here).
 *  - asOf = the date the cited information refers to (year / month / day), not the date of an automatic check.
 *  - history lists only transitions backed by dates already in the data set or in the cited source.
 * Load after data.js and i18n.js, before app.js. */
(function () {
  "use strict";
  var OBJ = window.OBJECTS, D = window.I18N && window.I18N.dict;
  if (!OBJ) return;

  var STATES = {
    operational: { color: "#34d399", glyph: "●", ring: "solid" },
    inactive: { color: "#94a3b8", glyph: "○", ring: "dotted" },
    abandoned: { color: "#f59e0b", glyph: "▲", ring: "dashed" },
    partial: { color: "#c084fc", glyph: "◐", ring: "double" },
    damaged: { color: "#f43f5e", glyph: "✕", ring: "solid" },
    unknown: { color: "#64748b", glyph: "?", ring: "dashed" }
  };
  var ORDER = ["operational", "inactive", "abandoned", "partial", "damaged", "unknown"];

  // ---- sources (only URLs that were opened/used in this project)
  var S = {
    apollo: { t: "NASA NSSDCA: Apollo Lunar Landings 1969-1972", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html" },
    lroc: { t: "LROC / ASU: 2016 Coordinates of Human Features on the Moon (PDF)", u: "https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf" },
    imp: { t: "NASA NSSDCA: Table of Anthropogenic Impacts and Spacecraft on the Moon", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html" },
    s3: { t: "NASA Science: Apollo 12 and Surveyor 3", u: "https://science.nasa.gov/resource/apollo-12-and-surveyor-3/" },
    isro: { t: "ISRO: Chandrayaan-3 mission summary", u: "https://www.isro.gov.in/NSPD2025/" },
    viking: { t: "NASA NSSDCA: Viking mission to Mars", u: "https://nssdc.gsfc.nasa.gov/planetary/viking.html" },
    list: { t: "List of artificial objects on Mars (summary table, cites NSSDC)", u: "https://en.wikipedia.org/wiki/List_of_artificial_objects_on_Mars" },
    ode: { t: "Mars ODE: existing landing sites (WUSTL / NASA PDS)", u: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm" },
    phoenix: { t: "Mars Daily (AFP): Phoenix probe mission on Mars ends", u: "https://www.marsdaily.com/reports/Phoenix_probe_mission_on_Mars_ends_NASA_999.html" },
    insight: { t: "Spaceflight Now: InSight lander bows out (21 Dec 2022)", u: "https://spaceflightnow.com/2022/12/21/nasas-insight-lander-bows-out-after-ground-shaking-mars-mission/" },
    ing: { t: "NASA/JPL via Phys.org: Ingenuity mission ends (25 Jan 2024)", u: "https://phys.org/news/2024-01-years-mars-nasa-ingenuity-helicopter.html" },
    cur: { t: "Astrobiology.com: Curiosity reaches 1 km elevation gain (4 Sep 2026; NASA/JPL material)", u: "https://astrobiology.com/2026/09/04/mars-curiosity-reaches-1-kilometer-elevation-gain/" },
    m2020: { t: "NASA: Mars 2020 Perseverance mission", u: "https://www.nasa.gov/missions/mars-2020-perseverance/" },
    pers: { t: "ARY News (22 Dec 2025): Perseverance mission extension to 2031 (secondary report)", u: "https://arynews.tv/nasa-loses-contact-with-maven-orbiter-extends-perseverance-mission-to-2031" }
  };

  // r = reason keys (texts "cr.<key>"), h = history [date, state, noteKey ("ch.<key>")]
  var R = {
    "apollo-11-lm": { s: "abandoned", a: "2016", r: ["lm"], src: [S.lroc, S.apollo] },
    "apollo-12-lm": { s: "abandoned", a: "2016", r: ["lm"], src: [S.lroc, S.apollo] },
    "apollo-14-lm": { s: "abandoned", a: "2016", r: ["lm"], src: [S.lroc, S.apollo] },
    "apollo-15-lm": { s: "abandoned", a: "2016", r: ["lm"], src: [S.lroc, S.apollo] },
    "apollo-16-lm": { s: "abandoned", a: "2016", r: ["lm"], src: [S.lroc, S.apollo] },
    "apollo-17-lm": { s: "abandoned", a: "2016", r: ["lm"], src: [S.lroc, S.apollo] },
    "apollo-15-lrv": { s: "abandoned", a: "2016", r: ["lrv"], src: [S.lroc, S.apollo] },
    "apollo-16-lrv": { s: "abandoned", a: "2016", r: ["lrv"], src: [S.lroc, S.apollo] },
    "apollo-17-lrv": { s: "abandoned", a: "2016", r: ["lrv"], src: [S.lroc, S.apollo] },
    "surveyor-3": { s: "partial", a: "1969-11-20", r: ["surv3"], src: [S.s3, S.lroc],
      h: [["1967-04-20", "operational", "landed"], ["1969-11-20", "partial", "surv3"]] },
    "luna-16": { s: "abandoned", a: "1970-09-21", r: ["luna16"], src: [S.imp],
      h: [["1970-09-20", "operational", "landed"]] },
    "luna-17": { s: "abandoned", a: "1970-11-17", r: ["luna17"], src: [S.imp],
      h: [["1970-11-17", "operational", "landed"]] },
    "lunokhod-1": { s: "inactive", a: "1971-09", r: ["ended", "lunokhod"], src: [S.imp],
      h: [["1970-11-17", "operational", "landed"], ["1971-09", "inactive", "endedOps"]] },
    "chandrayaan-3": { s: "unknown", a: null, r: ["c3"], src: [S.isro] },
    "apollo-14-sivb": { s: "unknown", a: "2016", r: ["sivb"], src: [S.lroc] },
    "apollo-17-sivb": { s: "unknown", a: "2016", r: ["sivb"], src: [S.lroc] },
    "viking-1": { s: "inactive", a: "1982-11-11", r: ["ended", "viking1"], src: [S.viking, S.list],
      h: [["1976-07-20", "operational", "landed"], ["1982-11-11", "inactive", "lastContact"]] },
    "viking-2": { s: "inactive", a: "1980-04-11", r: ["ended", "viking2"], src: [S.viking, S.list],
      h: [["1976-09-03", "operational", "landed"], ["1980-04-11", "inactive", "endedOps"]] },
    "pathfinder": { s: "inactive", a: "1997-09", r: ["ended", "pathfinder"], src: [S.list],
      h: [["1997-07-04", "operational", "landed"], ["1997-09", "inactive", "endedOps"]] },
    "spirit": { s: "inactive", a: "2011-05-25", r: ["ended", "spirit"], src: [S.ode, S.list],
      h: [["2004-01-04", "operational", "landed"], ["2011-05-25", "inactive", "spiritEnd"]] },
    "opportunity": { s: "inactive", a: "2019-02-13", r: ["ended", "opp"], src: [S.list],
      h: [["2004-01-25", "operational", "landed"], ["2019-02-13", "inactive", "oppEnd"]] },
    "phoenix": { s: "inactive", a: "2008-11-10", r: ["ended", "phoenix"], src: [S.phoenix, S.ode],
      h: [["2008-05-25", "operational", "landed"], ["2008-11-02", "operational", "phxLast"], ["2008-11-10", "inactive", "phxEnd"]] },
    "insight": { s: "inactive", a: "2022-12-21", r: ["ended", "insight"], src: [S.insight, S.list],
      h: [["2018-11-26", "operational", "landed"], ["2022-12-21", "inactive", "insEnd"]] },
    "curiosity": { s: "operational", a: "2026-09-04", r: ["cur"], src: [S.cur, S.list],
      h: [["2012-08-05", "operational", "landed"]] },
    "perseverance": { s: "operational", a: "2026-03-25", r: ["pers"], src: [S.m2020, S.pers],
      h: [["2021-02-18", "operational", "landed"]] },
    "ingenuity": { s: "damaged", a: "2024-01-25", r: ["ing"], src: [S.ing],
      h: [["2021-02-18", "operational", "landed"], ["2024-01-18", "damaged", "ingDmg"], ["2024-01-25", "damaged", "ingEnd"]] }
  };

  OBJ.forEach(function (o) {
    var r = R[o.id];
    o.condition = r ? { state: r.s, asOf: r.a, reasons: r.r, sources: r.src, history: (r.h || []).map(function (x) { return { date: x[0], state: x[1], note: x[2] }; }), curated: true }
      : { state: "unknown", asOf: null, reasons: ["none"], sources: [], history: [], curated: false };
  });

  function stateOf(o) { return (o && o.condition && STATES[o.condition.state]) ? o.condition.state : "unknown"; }
  function fmt(s) {
    if (!s) return "";
    var p = String(s).split("-"), loc = window.I18N && I18N.locale ? I18N.locale() : "en";
    try {
      if (p.length === 1) return p[0];
      var d = new Date(Date.UTC(+p[0], +p[1] - 1, p[2] ? +p[2] : 1));
      return new Intl.DateTimeFormat(loc, p.length === 2 ? { year: "numeric", month: "long", timeZone: "UTC" } : { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d);
    } catch (e) { return s; }
  }
  window.COND = {
    STATES: STATES, ORDER: ORDER, stateOf: stateOf, fmt: fmt,
    color: function (o) { return STATES[stateOf(o)].color; },
    glyph: function (o) { return STATES[stateOf(o)].glyph; },
    counts: function (list) { var c = {}; ORDER.forEach(function (k) { c[k] = 0; }); list.forEach(function (o) { c[stateOf(o)]++; }); return c; }
  };

  // ------------------------------------------------------------------ texts
  if (!D) return;
  var X = {
    en: {
      "cond.title": "Equipment condition", "cond.filter": "Condition", "cond.legend": "Condition",
      "cond.s.operational": "Operational", "cond.s.inactive": "Inactive", "cond.s.abandoned": "Abandoned",
      "cond.s.partial": "Partially preserved", "cond.s.damaged": "Damaged", "cond.s.unknown": "Unknown",
      "cond.d.operational": "Functions: the mission is operating.",
      "cond.d.inactive": "Operations ended. This says nothing about physical destruction.",
      "cond.d.abandoned": "Left on the surface (deliberately or at the end of the surface stay).",
      "cond.d.partial": "Only individual components remain at the site.",
      "cond.d.damaged": "Documented damage to the hardware.",
      "cond.d.unknown": "No reliable information about the condition.",
      "cond.asof": "Information current as of", "cond.nodate": "no date: not verified", "cond.reason": "Why this state", "cond.source": "Confirmation",
      "cond.history": "Status history", "cond.nohist": "No reliable dated history is recorded for this object.",
      "cond.curated": "Assigned by the project from the cited sources; not computed from the last signal date.",
      "cond.uncurated": "No structured condition record for this object yet.",
      "cond.legendTitle": "Equipment condition markers (ring style + colour)",
      "cond.all": "All conditions", "cond.n": "{n} of {m} shown",
      "cond.note": "Mission end ≠ destruction. A state is changed only when a source says so.",
      "cr.none": "No reliable information is recorded, so the state stays Unknown. It is never guessed from the date of the last signal.",
      "cr.lm": "The descent stage was the launch platform: the crew left the Moon in the ascent stage and the descent stage stayed on the surface by design. The cited LROC list records the hardware at the site.",
      "cr.lrv": "The rover was parked at the site when the crew finished their surface stay and was not returned to Earth. The cited LROC list records it at the site.",
      "cr.surv3": "The Apollo 12 crew visited the probe and removed its television camera and several other parts, which were returned to Earth (NASA). The rest of the spacecraft stayed at the site.",
      "cr.luna16": "Only a small return capsule lifted off with the sample. The landing stage served as launch platform and was left on the surface; NSSDCA lists it among spacecraft on the Moon.",
      "cr.luna17": "A one-way lander whose job ended when the rover rolled off; the platform stayed on the surface and NSSDCA lists it among spacecraft on the Moon.",
      "cr.ended": "Operations ended. A mission end is not a claim that the hardware was destroyed: it stays at its landing site and its physical condition is not documented in this data set.",
      "cr.lunokhod": "Designed to operate on the Moon only, with no return capability. Operations stopped in September 1971.",
      "cr.c3": "The data set records the end of the mission phase, but the current operating state is not confirmed in the sources used here (check ISRO). It is not inferred from the absence of signals.",
      "cr.sivb": "A rocket stage sent into a deliberate impact for lunar seismology. The cited LROC list gives the crater position, but the condition of any remaining hardware is not documented here.",
      "cr.viking1": "A fixed lander that cannot move; last contact on 11 November 1982 after 2,245 sols.",
      "cr.viking2": "A fixed lander that cannot move; operations ended on 11 April 1980 after 1,281 sols.",
      "cr.pathfinder": "Designed for a short mission; the data set records the end of operations in September 1997.",
      "cr.spirit": "Stuck in soft soil in 2009; last contact in March 2010; NASA ended the mission on 25 May 2011.",
      "cr.opp": "Contact was lost on 10 June 2018 during a global dust storm; NASA declared the mission complete on 13 February 2019.",
      "cr.phoenix": "The solar arrays could no longer recharge the batteries as sunlight faded in the northern autumn. The last signal came on 2 November 2008 and the mission was declared ended on 10 November 2008.",
      "cr.insight": "Dust on the solar panels left too little power. After two consecutive missed communication sessions NASA declared the mission over on 21 December 2022.",
      "cr.cur": "Still operating: NASA/JPL material published on 4 September 2026 reports the rover climbing Mount Sharp (images from sols 4972-4973, 1-2 August 2026).",
      "cr.pers": "Listed as active: the data set records 1,811 sols as of 25 March 2026, and a December 2025 news report cites JPL component tests supporting operations to 2031 (a projection, not a guarantee).",
      "cr.ing": "Rotor blades were damaged on flight 72 (18 January 2024), after which NASA ended the helicopter's mission on 25 January 2024. The damage is documented; its current condition is not.",
      "ch.landed": "Landed (date from the data set).", "ch.endedOps": "End of operations.", "ch.lastContact": "Last contact.",
      "ch.surv3": "Apollo 12 crew removed the camera and other parts (photo dated 20 Nov 1969).",
      "ch.spiritEnd": "Mission declared ended by NASA.", "ch.oppEnd": "Mission declared complete.", "ch.phxLast": "Last signal received.", "ch.phxEnd": "Mission declared ended.",
      "ch.insEnd": "Mission declared over.", "ch.ingDmg": "Rotor blades damaged on flight 72.", "ch.ingEnd": "Mission ended."
    },
    ru: {
      "cond.title": "Состояние оборудования", "cond.filter": "Состояние", "cond.legend": "Состояние",
      "cond.s.operational": "Функционирует", "cond.s.inactive": "Эксплуатация завершена", "cond.s.abandoned": "Оставлен на поверхности",
      "cond.s.partial": "Сохранились отдельные компоненты", "cond.s.damaged": "Повреждён", "cond.s.unknown": "Состояние неизвестно",
      "cond.d.operational": "Функционирует: миссия работает.",
      "cond.d.inactive": "Эксплуатация завершена. Это ничего не говорит о физическом разрушении.",
      "cond.d.abandoned": "Оставлен на поверхности (намеренно или по окончании работы на поверхности).",
      "cond.d.partial": "На месте остались только отдельные компоненты.",
      "cond.d.damaged": "Зафиксировано повреждение оборудования.",
      "cond.d.unknown": "Достоверных сведений о состоянии нет.",
      "cond.asof": "Сведения актуальны на", "cond.nodate": "дата не указана: не проверено", "cond.reason": "Почему такой статус", "cond.source": "Подтверждение",
      "cond.history": "История статуса", "cond.nohist": "Достоверной датированной истории для этого объекта не записано.",
      "cond.curated": "Назначено проектом по указанным источникам; не вычисляется по дате последнего сигнала.",
      "cond.uncurated": "Структурированной записи о состоянии для этого объекта пока нет.",
      "cond.legendTitle": "Маркеры состояния оборудования (стиль кольца + цвет)",
      "cond.all": "Все состояния", "cond.n": "Показано {n} из {m}",
      "cond.note": "Конец миссии ≠ разрушение. Статус меняется только если так сказано в источнике.",
      "cr.none": "Достоверных сведений нет, поэтому статус остаётся «неизвестно». Он никогда не угадывается по дате последнего сигнала.",
      "cr.lm": "Посадочная ступень была стартовой платформой: экипаж покинул Луну во взлётной ступени, а посадочная по замыслу осталась на поверхности. Указанный список LROC фиксирует оборудование на месте.",
      "cr.lrv": "Ровер оставили на месте, когда экипаж закончил работу на поверхности; на Землю он не возвращался. Указанный список LROC фиксирует его на месте.",
      "cr.surv3": "Экипаж «Аполлона-12» посетил аппарат, снял телекамеру и несколько других деталей и доставил их на Землю (NASA). Остальная часть аппарата осталась на месте.",
      "cr.luna16": "С образцом взлетела только небольшая возвращаемая капсула. Посадочная ступень служила стартовой платформой и осталась на поверхности; NSSDCA включает её в список аппаратов на Луне.",
      "cr.luna17": "Одноразовый посадочный аппарат: его задача закончилась, когда сошёл ровер; платформа осталась на поверхности, NSSDCA включает её в список аппаратов на Луне.",
      "cr.ended": "Эксплуатация завершена. Конец миссии не означает, что оборудование разрушено: оно остаётся на месте посадки, а его физическое состояние в этой базе не задокументировано.",
      "cr.lunokhod": "Рассчитан только на работу на Луне, без возможности возвращения. Работа прекратилась в сентябре 1971 года.",
      "cr.c3": "В базе записан конец активной фазы миссии, но текущее рабочее состояние в использованных источниках не подтверждено (проверьте ISRO). Оно не выводится из отсутствия сигналов.",
      "cr.sivb": "Ракетная ступень, намеренно направленная на падение для лунной сейсмологии. Указанный список LROC даёт положение кратера, но состояние возможных остатков оборудования здесь не задокументировано.",
      "cr.viking1": "Стационарный аппарат, не способный двигаться; последняя связь 11 ноября 1982 года после 2245 солов.",
      "cr.viking2": "Стационарный аппарат, не способный двигаться; работа завершилась 11 апреля 1980 года после 1281 сола.",
      "cr.pathfinder": "Рассчитан на короткую миссию; в базе записано окончание работы в сентябре 1997 года.",
      "cr.spirit": "Застрял в рыхлом грунте в 2009 году; последняя связь в марте 2010 года; NASA завершило миссию 25 мая 2011 года.",
      "cr.opp": "Связь потеряна 10 июня 2018 года во время глобальной пылевой бури; NASA объявило миссию завершённой 13 февраля 2019 года.",
      "cr.phoenix": "Солнечные батареи уже не могли заряжать аккумуляторы, когда осенью на севере свет ослабел. Последний сигнал пришёл 2 ноября 2008 года, миссию объявили завершённой 10 ноября 2008 года.",
      "cr.insight": "Пыль на солнечных панелях оставила слишком мало энергии. После двух подряд пропущенных сеансов связи NASA объявило миссию завершённой 21 декабря 2022 года.",
      "cr.cur": "Продолжает работать: материалы NASA/JPL от 4 сентября 2026 года сообщают, что ровер поднимается по склону горы Шарп (снимки солов 4972–4973, 1–2 августа 2026 года).",
      "cr.pers": "Значится действующим: в базе записано 1811 солов на 25 марта 2026 года, а новостная публикация декабря 2025 года ссылается на испытания компонентов JPL, поддерживающие работу до 2031 года (это прогноз, а не гарантия).",
      "cr.ing": "Лопасти винтов были повреждены в полёте 72 (18 января 2024 года), после чего NASA завершило миссию вертолёта 25 января 2024 года. Повреждение задокументировано; текущее состояние — нет.",
      "ch.landed": "Посадка (дата из базы).", "ch.endedOps": "Конец эксплуатации.", "ch.lastContact": "Последняя связь.",
      "ch.surv3": "Экипаж «Аполлона-12» снял камеру и другие детали (снимок от 20 ноября 1969 года).",
      "ch.spiritEnd": "NASA объявило миссию завершённой.", "ch.oppEnd": "Миссия объявлена завершённой.", "ch.phxLast": "Получен последний сигнал.", "ch.phxEnd": "Миссия объявлена завершённой.",
      "ch.insEnd": "Миссия объявлена завершённой.", "ch.ingDmg": "Повреждены лопасти винтов в полёте 72.", "ch.ingEnd": "Миссия завершена."
    },
    kk: {
      "cond.title": "Жабдықтың жай-күйі", "cond.filter": "Жай-күйі", "cond.legend": "Жай-күйі",
      "cond.s.operational": "Жұмыс істеп тұр", "cond.s.inactive": "Пайдалану аяқталды", "cond.s.abandoned": "Бетінде қалдырылған",
      "cond.s.partial": "Жекелеген бөліктері сақталған", "cond.s.damaged": "Зақымдалған", "cond.s.unknown": "Жай-күйі белгісіз",
      "cond.d.operational": "Жұмыс істеп тұр: миссия жұмыс істеуде.",
      "cond.d.inactive": "Пайдалану аяқталды. Бұл физикалық жойылғанын білдірмейді.",
      "cond.d.abandoned": "Бетінде қалдырылған (әдейі немесе бетте жұмыс аяқталған соң).",
      "cond.d.partial": "Орнында тек жекелеген бөлшектер қалған.",
      "cond.d.damaged": "Жабдықтың зақымдалғаны тіркелген.",
      "cond.d.unknown": "Жай-күйі туралы сенімді мәлімет жоқ.",
      "cond.asof": "Мәлімет мына күнге өзекті", "cond.nodate": "күні жоқ: расталмаған", "cond.reason": "Неге мұндай мәртебе", "cond.source": "Растау",
      "cond.history": "Мәртебе тарихы", "cond.nohist": "Бұл нысан үшін сенімді күн қойылған тарих жазылмаған.",
      "cond.curated": "Жоба көрсетілген дереккөздер бойынша тағайындаған; соңғы сигнал күнінен есептелмейді.",
      "cond.uncurated": "Бұл нысан үшін жай-күй туралы құрылымдалған жазба әзірге жоқ.",
      "cond.legendTitle": "Жабдық жай-күйінің таңбалары (шеңбер стилі + түс)",
      "cond.all": "Барлық жай-күйлер", "cond.n": "{m} ішінен {n} көрсетілді",
      "cond.note": "Миссияның аяқталуы ≠ жойылу. Мәртебе тек дереккөз айтса ғана өзгереді.",
      "cr.none": "Сенімді мәлімет жоқ, сондықтан мәртебе «белгісіз» болып қалады. Ол соңғы сигнал күніне қарап болжанбайды.",
      "cr.lm": "Қонған сатысы ұшыру платформасы болды: экипаж Айдан көтерілу сатысымен ұшты, ал қонған сатысы жоспар бойынша бетінде қалды. Көрсетілген LROC тізімі жабдықты орнында тіркейді.",
      "cr.lrv": "Экипаж бетте жұмысын аяқтағанда ровер орнында қалдырылды; Жерге қайтарылмады. Көрсетілген LROC тізімі оны орнында тіркейді.",
      "cr.surv3": "«Аполлон-12» экипажы аппаратқа барып, телекамерасы мен бірнеше басқа бөлшегін алып, Жерге жеткізді (NASA). Аппараттың қалған бөлігі орнында қалды.",
      "cr.luna16": "Үлгімен тек шағын қайтару капсуласы көтерілді. Қонған сатысы ұшыру платформасы болып, бетінде қалды; NSSDCA оны Айдағы аппараттар тізіміне енгізеді.",
      "cr.luna17": "Бір бағытты қондырғыш: ровер түскен соң міндеті аяқталды; платформа бетінде қалды, NSSDCA оны Айдағы аппараттар тізіміне енгізеді.",
      "cr.ended": "Пайдалану аяқталды. Миссияның аяқталуы жабдықтың жойылғанын білдірмейді: ол қону орнында қалады, ал оның физикалық жай-күйі бұл деректер жиынында құжатталмаған.",
      "cr.lunokhod": "Тек Айда жұмыс істеуге арналған, қайтару мүмкіндігі жоқ. Жұмыс 1971 жылғы қыркүйекте тоқтады.",
      "cr.c3": "Деректер жиынында миссия кезеңінің аяқталуы жазылған, бірақ қазіргі жұмыс жай-күйі қолданылған дереккөздерде расталмаған (ISRO-дан тексеріңіз). Ол сигналдың болмауынан шығарылмайды.",
      "cr.sivb": "Ай сейсмологиясы үшін әдейі соқтығыстырылған зымыран сатысы. Көрсетілген LROC тізімі кратердің орнын береді, бірақ қалған жабдықтың жай-күйі мұнда құжатталмаған.",
      "cr.viking1": "Қозғала алмайтын тіркелген аппарат; соңғы байланыс 1982 жылғы 11 қарашада, 2245 солдан кейін.",
      "cr.viking2": "Қозғала алмайтын тіркелген аппарат; жұмысы 1980 жылғы 11 сәуірде, 1281 солдан кейін аяқталды.",
      "cr.pathfinder": "Қысқа миссияға арналған; деректер жиынында жұмыстың 1997 жылғы қыркүйекте аяқталғаны жазылған.",
      "cr.spirit": "2009 жылы борпылдақ топыраққа батып қалды; соңғы байланыс 2010 жылғы наурызда; NASA миссияны 2011 жылғы 25 мамырда аяқтады.",
      "cr.opp": "Байланыс 2018 жылғы 10 маусымда жаһандық шаң дауылы кезінде үзілді; NASA миссияны 2019 жылғы 13 ақпанда аяқталды деп жариялады.",
      "cr.phoenix": "Солтүстікте күз түскенде күн сәулесі азайып, күн батареялары аккумуляторларды зарядтай алмады. Соңғы сигнал 2008 жылғы 2 қарашада келді, миссия 2008 жылғы 10 қарашада аяқталды деп жарияланды.",
      "cr.insight": "Күн панельдеріндегі шаң қуатты тым аз қалдырды. Қатарынан екі байланыс сеансы өткізіп алынғаннан кейін NASA миссияны 2022 жылғы 21 желтоқсанда аяқталды деп жариялады.",
      "cr.cur": "Жұмысын жалғастыруда: NASA/JPL материалдары (2026 жылғы 4 қыркүйек) роверді Шарп тауына көтеріліп жатыр деп хабарлайды (4972–4973 сол суреттері, 2026 жылғы 1–2 тамыз).",
      "cr.pers": "Белсенді деп көрсетілген: деректер жиынында 2026 жылғы 25 наурыздағы жағдай бойынша 1811 сол жазылған, ал 2025 жылғы желтоқсандағы жаңалық JPL-дің 2031 жылға дейін жұмысты қолдайтын компонент сынақтарына сілтеме жасайды (бұл болжам, кепілдік емес).",
      "cr.ing": "Қанат қалақтары 72-ұшуда (2024 жылғы 18 қаңтар) зақымданды, содан кейін NASA тікұшақ миссиясын 2024 жылғы 25 қаңтарда аяқтады. Зақым құжатталған; қазіргі жай-күйі құжатталмаған.",
      "ch.landed": "Қону (күні деректер жиынынан).", "ch.endedOps": "Пайдалану аяқталды.", "ch.lastContact": "Соңғы байланыс.",
      "ch.surv3": "«Аполлон-12» экипажы камера мен басқа бөлшектерді алды (1969 жылғы 20 қарашадағы сурет).",
      "ch.spiritEnd": "NASA миссияны аяқталды деп жариялады.", "ch.oppEnd": "Миссия аяқталды деп жарияланды.", "ch.phxLast": "Соңғы сигнал алынды.", "ch.phxEnd": "Миссия аяқталды деп жарияланды.",
      "ch.insEnd": "Миссия аяқталды деп жарияланды.", "ch.ingDmg": "72-ұшуда қанат қалақтары зақымданды.", "ch.ingEnd": "Миссия аяқталды."
    }
  };
  ["en", "ru", "kk"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
