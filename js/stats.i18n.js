/* Statistics Dashboard: interface texts (EN / RU / KK). Merged into the main dictionary; load after i18n.js. */
(function () {
  "use strict";
  var D = window.I18N && window.I18N.dict; if (!D) return;
  var X = {
    en: {
      "nav.stats": "Statistics",
      "st.title": "Statistics Dashboard", "st.lede": "Figures about the missions and equipment left on the Moon and Mars. Every number is computed on the fly from the records of the project database, so new objects appear here automatically.",
      "st.note": "The numbers describe this project's catalogue, not every mission ever flown. Click a figure or a chart element to list the matching objects.",
      "st.f.body": "Body", "st.f.all": "Moon and Mars", "st.f.from": "From year", "st.f.to": "to year", "st.f.any": "Any", "st.reset": "Reset filters", "st.period": "Period is counted by landing year (launch year if there is no landing date).",
      "st.k.total": "Registered objects", "st.k.moon": "Objects on the Moon", "st.k.mars": "Objects on Mars", "st.k.missions": "Space missions",
      "st.k.landers": "Landers", "st.k.rovers": "Rovers", "st.k.instr": "Science platforms", "st.k.confirmed": "Objects with a confirmed status", "st.k.unknown": "Objects with unknown condition",
      "st.kh.landers": "Objects whose database type contains \"lander\". Apollo lunar modules are typed \"Apollo mission hardware\" and are not counted here.",
      "st.kh.rovers": "Objects whose database type contains \"rover\" (includes lunar rovers).",
      "st.kh.instr": "The database has no records of individual instruments; this counts objects typed \"Stationary science platform\".",
      "st.kh.confirmed": "A curated condition record with a source and a state other than Unknown.",
      "st.kh.unknown": "State Unknown, including objects without a condition record.",
      "st.c.split": "Objects: Moon vs Mars", "st.c.years": "Missions by launch year", "st.c.cat": "Equipment by category", "st.c.status": "Equipment condition", "st.c.legacy": "Mission status (legacy field)", "st.c.tl": "Chronology of missions",
      "st.tl.note": "● launch · ◆ landing · bar: landing to end of operations; dashed bar: still operating.",
      "st.none": "No objects match the filters.", "st.list": "Matching objects", "st.listFor": "Showing: {w}", "st.count": "{n} objects", "st.clear": "Clear selection",
      "st.show": "Map", "st.show3d": "3D", "st.open": "Open the map of this body", "st.pickHint": "Click a figure or a chart element to see the objects here.",
      "st.w.total": "all registered objects", "st.w.planet": "objects on {p}", "st.w.missions": "all missions", "st.w.landers": "landers", "st.w.rovers": "rovers", "st.w.instr": "science platforms",
      "st.w.confirmed": "confirmed status", "st.w.unknown": "unknown condition", "st.w.type": "category: {t}", "st.w.cond": "condition: {c}", "st.w.legacy": "status: {c}", "st.w.year": "missions launched in {y}", "st.w.mission": "mission: {m}",
      "st.mission": "Mission", "st.m.n": "{n} missions"
    },
    ru: {
      "nav.stats": "Статистика",
      "st.title": "Панель статистики", "st.lede": "Показатели о миссиях и оборудовании, оставленном на Луне и Марсе. Каждое число вычисляется на лету по записям базы проекта, поэтому новые объекты появляются здесь автоматически.",
      "st.note": "Числа описывают каталог проекта, а не все когда-либо летавшие миссии. Нажмите на число или элемент диаграммы, чтобы увидеть подходящие объекты.",
      "st.f.body": "Тело", "st.f.all": "Луна и Марс", "st.f.from": "С года", "st.f.to": "по год", "st.f.any": "Любой", "st.reset": "Сбросить фильтры", "st.period": "Период считается по году посадки (по году запуска, если даты посадки нет).",
      "st.k.total": "Зарегистрировано объектов", "st.k.moon": "Объектов на Луне", "st.k.mars": "Объектов на Марсе", "st.k.missions": "Космических миссий",
      "st.k.landers": "Посадочных аппаратов", "st.k.rovers": "Роверов", "st.k.instr": "Научных платформ", "st.k.confirmed": "Объектов с подтверждённым статусом", "st.k.unknown": "Объектов с неизвестным состоянием",
      "st.kh.landers": "Объекты, в типе которых в базе есть «посадочный аппарат». Лунные модули Apollo имеют тип «Оборудование миссии Apollo» и здесь не считаются.",
      "st.kh.rovers": "Объекты, в типе которых в базе есть «ровер» (включая лунные ровера).",
      "st.kh.instr": "В базе нет записей об отдельных приборах; считаются объекты типа «Стационарная научная платформа».",
      "st.kh.confirmed": "Выверенная запись о состоянии с источником и состоянием, отличным от «неизвестно».",
      "st.kh.unknown": "Состояние «неизвестно», включая объекты без записи о состоянии.",
      "st.c.split": "Объекты: Луна и Марс", "st.c.years": "Миссии по годам запуска", "st.c.cat": "Оборудование по категориям", "st.c.status": "Состояние оборудования", "st.c.legacy": "Статус миссии (прежнее поле)", "st.c.tl": "Хронология космических миссий",
      "st.tl.note": "● запуск · ◆ посадка · полоса: от посадки до конца эксплуатации; пунктир: продолжает работу.",
      "st.none": "Нет объектов, подходящих под фильтры.", "st.list": "Подходящие объекты", "st.listFor": "Показано: {w}", "st.count": "Объектов: {n}", "st.clear": "Снять выбор",
      "st.show": "Карта", "st.show3d": "3D", "st.open": "Открыть карту этого тела", "st.pickHint": "Нажмите на число или элемент диаграммы, чтобы увидеть объекты здесь.",
      "st.w.total": "все зарегистрированные объекты", "st.w.planet": "объекты: {p}", "st.w.missions": "все миссии", "st.w.landers": "посадочные аппараты", "st.w.rovers": "роверы", "st.w.instr": "научные платформы",
      "st.w.confirmed": "подтверждённый статус", "st.w.unknown": "неизвестное состояние", "st.w.type": "категория: {t}", "st.w.cond": "состояние: {c}", "st.w.legacy": "статус: {c}", "st.w.year": "миссии, запущенные в {y}", "st.w.mission": "миссия: {m}",
      "st.mission": "Миссия", "st.m.n": "Миссий: {n}"
    },
    kk: {
      "nav.stats": "Статистика",
      "st.title": "Статистика тақтасы", "st.lede": "Ай мен Марста қалдырылған миссиялар мен жабдық туралы көрсеткіштер. Әр сан жоба дерекқорының жазбаларынан бірден есептеледі, сондықтан жаңа нысандар осында автоматты түрде пайда болады.",
      "st.note": "Сандар жоба каталогын сипаттайды, бұрын ұшқан барлық миссияларды емес. Сәйкес нысандарды көру үшін санды немесе диаграмма элементін басыңыз.",
      "st.f.body": "Дене", "st.f.all": "Ай және Марс", "st.f.from": "Жылдан", "st.f.to": "жылға дейін", "st.f.any": "Кез келген", "st.reset": "Сүзгілерді тастау", "st.period": "Кезең қону жылы бойынша есептеледі (қону күні жоқ болса, ұшыру жылы бойынша).",
      "st.k.total": "Тіркелген нысандар", "st.k.moon": "Айдағы нысандар", "st.k.mars": "Марстағы нысандар", "st.k.missions": "Ғарыш миссиялары",
      "st.k.landers": "Қону аппараттары", "st.k.rovers": "Роверлер", "st.k.instr": "Ғылыми платформалар", "st.k.confirmed": "Мәртебесі расталған нысандар", "st.k.unknown": "Жай-күйі белгісіз нысандар",
      "st.kh.landers": "Дерекқордағы түрінде «қону аппараты» бар нысандар. Apollo ай модульдері «Apollo миссиясының жабдығы» түрінде және мұнда есептелмейді.",
      "st.kh.rovers": "Дерекқордағы түрінде «ровер» бар нысандар (ай роверлерін қоса).",
      "st.kh.instr": "Дерекқорда жекелеген аспаптар туралы жазба жоқ; «Стационарлық ғылыми платформа» түріндегі нысандар есептеледі.",
      "st.kh.confirmed": "Дереккөзі бар және «белгісіз» емес жай-күйі бар тексерілген жай-күй жазбасы.",
      "st.kh.unknown": "Жай-күйі «белгісіз», жай-күй жазбасы жоқ нысандарды қоса.",
      "st.c.split": "Нысандар: Ай және Марс", "st.c.years": "Ұшыру жылдары бойынша миссиялар", "st.c.cat": "Санаттар бойынша жабдық", "st.c.status": "Жабдық жай-күйі", "st.c.legacy": "Миссия мәртебесі (бұрынғы өріс)", "st.c.tl": "Ғарыш миссияларының хронологиясы",
      "st.tl.note": "● ұшыру · ◆ қону · жолақ: қонудан пайдалану аяқталғанға дейін; үзік жолақ: жұмысын жалғастыруда.",
      "st.none": "Сүзгілерге сәйкес нысандар жоқ.", "st.list": "Сәйкес нысандар", "st.listFor": "Көрсетілген: {w}", "st.count": "Нысан саны: {n}", "st.clear": "Таңдауды алып тастау",
      "st.show": "Карта", "st.show3d": "3D", "st.open": "Осы дененің картасын ашу", "st.pickHint": "Нысандарды осында көру үшін санды немесе диаграмма элементін басыңыз.",
      "st.w.total": "барлық тіркелген нысандар", "st.w.planet": "нысандар: {p}", "st.w.missions": "барлық миссиялар", "st.w.landers": "қону аппараттары", "st.w.rovers": "роверлер", "st.w.instr": "ғылыми платформалар",
      "st.w.confirmed": "расталған мәртебе", "st.w.unknown": "белгісіз жай-күй", "st.w.type": "санат: {t}", "st.w.cond": "жай-күйі: {c}", "st.w.legacy": "мәртебе: {c}", "st.w.year": "{y} жылы ұшырылған миссиялар", "st.w.mission": "миссия: {m}",
      "st.mission": "Миссия", "st.m.n": "Миссия саны: {n}"
    }
  };
  ["en", "ru", "kk"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
