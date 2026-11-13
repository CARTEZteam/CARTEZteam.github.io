/* Photo Archive: interface texts (EN / RU / KK). Merged into the main dictionary; load after i18n.js. */
(function () {
  "use strict";
  var D = window.I18N && window.I18N.dict; if (!D) return;
  var X = {
    en: {
      "nav.photos": "Photo Archive",
      "pa.title": "Photo Archive", "pa.lede": "Photographs of Moon and Mars exploration, retrieved live from NASA open archives. Nothing is stored in the project database: the page keeps only a short-lived browser cache of titles and links.",
      "pa.note": "Images are found by mission-specific searches and filtered so that the mission name appears in the record. The date is the date_created field of the NASA record (usually the capture date, but it can be the publication date). Captions are NASA's English text.",
      "pa.body": "Body", "pa.mission": "Mission", "pa.cat": "Category", "pa.from": "From year", "pa.to": "to year", "pa.search": "Search titles", "pa.searchPh": "e.g. footprint, panorama, crater",
      "pa.all": "All", "pa.any": "Any", "pa.reset": "Reset filters", "pa.nasaSearch": "Search the NASA library for this phrase", "pa.more": "Show more", "pa.count": "{n} photos shown of {m} matching",
      "pa.cat.crewed": "Crewed missions (Apollo archive)", "pa.cat.surface": "Surface imagery", "pa.cat.rovers": "Rovers and landers", "pa.cat.orbital": "Orbital imagery (LRO, MRO, HiRISE)", "pa.cat.raw": "Raw rover camera photos", "pa.cat.search": "Search results",
      "pa.status.loading": "Loading archives: {d} of {t} searches done…", "pa.status.done": "{t} searches done", "pa.status.fail": "{f} of {t} searches failed (network or API error).", "pa.retry": "Retry failed searches",
      "pa.empty": "No photos match these filters.", "pa.emptyColl": "NASA returned no matching photos for this mission yet. Try the NASA library link.",
      "pa.ph.missing": "Image unavailable", "pa.ph.credit": "Credit",
      "pa.v.source": "Source", "pa.v.mission": "Mission", "pa.v.cat": "Category", "pa.v.credit": "Credit / origin", "pa.v.date": "Date (NASA record)", "pa.v.dateNone": "date not given",
      "pa.v.obj": "Open in Object Explorer: {n}", "pa.v.map": "Show site on map: {n}", "pa.v.mapNote": "Coordinates are those of the linked object's site; they are not the exact camera position.", "pa.v.noCoord": "No coordinates are known for this image.",
      "pa.src.nasa": "NASA Image and Video Library", "pa.src.rover": "NASA Mars Rover Photos API", "pa.credit.nasa": "NASA", "pa.credit.unknown": "NASA (creator not stated in the record)",
      "pa.raw.title": "Raw rover camera photos", "pa.raw.text": "Latest raw images from the NASA Mars Rover Photos API. This service is optional: it may be unavailable or rate-limited, and raw images are unprocessed.",
      "pa.raw.btn": "Load latest rover photos", "pa.raw.ok": "Rover photos loaded.", "pa.raw.fail": "The Mars Rover Photos API is not available right now.",
      "pa.raw.title1": "{cam}, sol {sol}",
      "pa.other": "Other open archives", "pa.other.hirise": "HiRISE (University of Arizona)", "pa.other.lroc": "LROC (Arizona State University)", "pa.other.alsj": "Apollo Lunar Surface Journal", "pa.other.apollo": "NASA Apollo archive (Johnson Space Center)",
      "pa.other.note": "These archives have no public search API for this page, so they are linked rather than embedded. Open the original archive for full-resolution products.",
      "lb.fs": "Fullscreen"
    },
    ru: {
      "nav.photos": "Архив фото",
      "pa.title": "Архив фотографий", "pa.lede": "Фотографии исследования Луны и Марса, загружаемые в реальном времени из открытых архивов NASA. В базе проекта ничего не хранится: страница держит лишь недолговечный кэш названий и ссылок в браузере.",
      "pa.note": "Снимки находятся поиском по каждой миссии и отфильтровываются так, чтобы название миссии встречалось в записи. Дата — поле date_created записи NASA (обычно дата съёмки, но может быть датой публикации). Подписи — английский текст NASA.",
      "pa.body": "Тело", "pa.mission": "Миссия", "pa.cat": "Категория", "pa.from": "С года", "pa.to": "по год", "pa.search": "Поиск по названиям", "pa.searchPh": "например: след, панорама, кратер",
      "pa.all": "Все", "pa.any": "Любой", "pa.reset": "Сбросить фильтры", "pa.nasaSearch": "Искать эту фразу в библиотеке NASA", "pa.more": "Показать ещё", "pa.count": "Показано фото: {n} из {m} подходящих",
      "pa.cat.crewed": "Пилотируемые миссии (архив Apollo)", "pa.cat.surface": "Снимки поверхности", "pa.cat.rovers": "Роверы и посадочные аппараты", "pa.cat.orbital": "Орбитальные снимки (LRO, MRO, HiRISE)", "pa.cat.raw": "Сырые снимки камер роверов", "pa.cat.search": "Результаты поиска",
      "pa.status.loading": "Загрузка архивов: выполнено {d} из {t} поисков…", "pa.status.done": "Выполнено поисков: {t}", "pa.status.fail": "Не удались {f} из {t} поисков (сеть или ошибка API).", "pa.retry": "Повторить неудавшиеся поиски",
      "pa.empty": "Нет фотографий, подходящих под фильтры.", "pa.emptyColl": "NASA пока не вернуло подходящих фото для этой миссии. Попробуйте ссылку на библиотеку NASA.",
      "pa.ph.missing": "Изображение недоступно", "pa.ph.credit": "Автор",
      "pa.v.source": "Источник", "pa.v.mission": "Миссия", "pa.v.cat": "Категория", "pa.v.credit": "Авторство / происхождение", "pa.v.date": "Дата (запись NASA)", "pa.v.dateNone": "дата не указана",
      "pa.v.obj": "Открыть в Object Explorer: {n}", "pa.v.map": "Показать место на карте: {n}", "pa.v.mapNote": "Координаты — это место связанного объекта; это не точное положение камеры.", "pa.v.noCoord": "Координаты этого снимка неизвестны.",
      "pa.src.nasa": "NASA Image and Video Library", "pa.src.rover": "NASA Mars Rover Photos API", "pa.credit.nasa": "NASA", "pa.credit.unknown": "NASA (автор в записи не указан)",
      "pa.raw.title": "Сырые снимки камер роверов", "pa.raw.text": "Последние сырые снимки из NASA Mars Rover Photos API. Сервис необязательный: он может быть недоступен или ограничен по частоте запросов, а сырые снимки не обработаны.",
      "pa.raw.btn": "Загрузить последние снимки роверов", "pa.raw.ok": "Снимки роверов загружены.", "pa.raw.fail": "Mars Rover Photos API сейчас недоступен.",
      "pa.raw.title1": "{cam}, сол {sol}",
      "pa.other": "Другие открытые архивы", "pa.other.hirise": "HiRISE (Университет Аризоны)", "pa.other.lroc": "LROC (Университет штата Аризона)", "pa.other.alsj": "Apollo Lunar Surface Journal", "pa.other.apollo": "Архив Apollo NASA (Центр Джонсона)",
      "pa.other.note": "У этих архивов нет публичного API поиска для этой страницы, поэтому даны ссылки, а не встраивание. Полноразмерные материалы смотрите в исходном архиве.",
      "lb.fs": "Во весь экран"
    },
    kk: {
      "nav.photos": "Фото мұрағаты",
      "pa.title": "Фотосуреттер мұрағаты", "pa.lede": "NASA ашық мұрағаттарынан нақты уақытта жүктелетін Ай мен Марсты зерттеу фотосуреттері. Жоба дерекқорында ештеңе сақталмайды: бет браузерде тек атаулар мен сілтемелердің қысқа мерзімді кэшін ұстайды.",
      "pa.note": "Суреттер әр миссия бойынша іздеумен табылады және миссия атауы жазбада кездесетіндей сүзіледі. Күні — NASA жазбасының date_created өрісі (әдетте түсірілген күн, бірақ жарияланған күн болуы мүмкін). Жазулар — NASA-ның ағылшынша мәтіні.",
      "pa.body": "Дене", "pa.mission": "Миссия", "pa.cat": "Санат", "pa.from": "Жылдан", "pa.to": "жылға дейін", "pa.search": "Атау бойынша іздеу", "pa.searchPh": "мысалы: із, панорама, кратер",
      "pa.all": "Барлығы", "pa.any": "Кез келген", "pa.reset": "Сүзгілерді тастау", "pa.nasaSearch": "Бұл сөзді NASA кітапханасынан іздеу", "pa.more": "Тағы көрсету", "pa.count": "Көрсетілген фото: {n}, сәйкес {m} ішінен",
      "pa.cat.crewed": "Адамдар ұшқан миссиялар (Apollo мұрағаты)", "pa.cat.surface": "Бет суреттері", "pa.cat.rovers": "Роверлер және қону аппараттары", "pa.cat.orbital": "Орбиталық суреттер (LRO, MRO, HiRISE)", "pa.cat.raw": "Роверлер камераларының өңделмеген суреттері", "pa.cat.search": "Іздеу нәтижелері",
      "pa.status.loading": "Мұрағаттар жүктелуде: {t} іздеудің {d} орындалды…", "pa.status.done": "Орындалған іздеу: {t}", "pa.status.fail": "{t} іздеудің {f} сәтсіз болды (желі немесе API қатесі).", "pa.retry": "Сәтсіз іздеулерді қайталау",
      "pa.empty": "Сүзгілерге сәйкес фотосуреттер жоқ.", "pa.emptyColl": "NASA бұл миссия бойынша әзірге сәйкес фото қайтармады. NASA кітапханасына сілтемені қолданып көріңіз.",
      "pa.ph.missing": "Сурет қолжетімсіз", "pa.ph.credit": "Авторы",
      "pa.v.source": "Дереккөз", "pa.v.mission": "Миссия", "pa.v.cat": "Санат", "pa.v.credit": "Авторлығы / шығу тегі", "pa.v.date": "Күні (NASA жазбасы)", "pa.v.dateNone": "күні көрсетілмеген",
      "pa.v.obj": "Object Explorer-де ашу: {n}", "pa.v.map": "Орынды картада көрсету: {n}", "pa.v.mapNote": "Координаттар — байланысты нысанның орны; бұл камераның нақты орны емес.", "pa.v.noCoord": "Бұл сурет үшін координаттар белгісіз.",
      "pa.src.nasa": "NASA Image and Video Library", "pa.src.rover": "NASA Mars Rover Photos API", "pa.credit.nasa": "NASA", "pa.credit.unknown": "NASA (авторы жазбада көрсетілмеген)",
      "pa.raw.title": "Роверлер камераларының өңделмеген суреттері", "pa.raw.text": "NASA Mars Rover Photos API-дан соңғы өңделмеген суреттер. Қызмет міндетті емес: ол қолжетімсіз немесе сұраныс жиілігі шектелген болуы мүмкін, ал өңделмеген суреттер өңделмеген.",
      "pa.raw.btn": "Роверлердің соңғы суреттерін жүктеу", "pa.raw.ok": "Роверлер суреттері жүктелді.", "pa.raw.fail": "Mars Rover Photos API қазір қолжетімсіз.",
      "pa.raw.title1": "{cam}, {sol}-сол",
      "pa.other": "Басқа ашық мұрағаттар", "pa.other.hirise": "HiRISE (Аризона университеті)", "pa.other.lroc": "LROC (Аризона мемлекеттік университеті)", "pa.other.alsj": "Apollo Lunar Surface Journal", "pa.other.apollo": "NASA Apollo мұрағаты (Джонсон орталығы)",
      "pa.other.note": "Бұл мұрағаттарда осы бетке арналған жария іздеу API-ы жоқ, сондықтан олар ендірілмей, сілтеме түрінде берілген. Толық өлшемді материалдарды бастапқы мұрағаттан қараңыз.",
      "lb.fs": "Толық экран"
    }
  };
  ["en", "ru", "kk"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
