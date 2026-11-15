/* i18n: interface strings (English only).
 * All visible text lives in string tables (this file and js/*.i18n.js) instead of being hard-coded in the markup.
 * - t(key, vars)         look up a key, {name} placeholders are replaced from vars
 * - setLang(code)        re-apply the strings to the page (only "en" exists)
 * - data-i18n="key"      element text          data-i18n-html="key"  element HTML (trusted strings only)
 * - data-i18n-attr="attr:key;attr2:key2"       attributes (placeholder, aria-label, title ...)
 */
(function () {
  "use strict";

  var LANGS = ["en"];
  var LOCALE = { en: "en-GB" };

  var D = {};

  D.en = {
    "doc.title": "Abandoned but not Forgotten",
    "doc.desc": "An interactive museum of the machines humanity left on the Moon and Mars. NASA Space Apps Challenge 2026.",
    "brand.name": "Abandoned but not Forgotten",
    "brand.aria": "Abandoned but not Forgotten, home",
    "nav.aria": "Main",
    "nav.home": "Home", "nav.moon": "Moon", "nav.mars": "Mars", "nav.timeline": "Mission Timeline", "nav.about": "Sources",

    "hero.eyebrow": "NASA Space Apps Challenge 2026 · Storytelling",
    "hero.title": "Abandoned but<br>not Forgotten",
    "hero.lede": "Explore the forgotten remnants of humanity's journey across the Moon and Mars.",
    "hero.cta": "Explore the surface",
    "hero.quote": "Every object has a story. Every landing site is a piece of human history.",
    "door.moon.label": "Moon", "door.moon.title": "Explore Lunar Heritage",
    "door.mars.label": "Mars", "door.mars.title": "Explore Martian Heritage",
    "door.meta": "{n} objects · {k} still operating",
    "stylized": "Planets above are stylized drawings. Real NASA mosaics load in the explorer.",

    "body.moon": "Moon", "body.mars": "Mars",
    "side.toggle": "Objects",
    "search.label": "Search objects and missions",
    "search.ph": "Search object or mission",
    "f.status": "Status", "f.type": "Type", "f.era": "Era", "f.all": "All",
    "f.done": "Completed missions only",
    "status.left": "Left behind on purpose",
    "status.active": "Still operating",
    "status.ended": "Mission ended",
    "status.impact": "Impact site",
    "legend.area": "Region only",
    "legend.aria": "Legend",
    "stats.aria": "Collection statistics",
    "stats.total": "Total objects", "stats.moon": "Lunar artifacts", "stats.mars": "Martian artifacts",
    "stats.done": "Completed missions", "stats.agencies": "Agencies", "stats.active": "Still operating",
    "count": "{n} of {m} objects shown",
    "list.empty": "No objects match these filters.",
    "list.cmp": "+ Compare", "list.cmpOn": "✓ Compare", "list.cmpAria": "Compare {name}",
    "tray.title": "Compare", "tray.open": "Open comparison", "tray.more": "Pick one more", "tray.clear": "Clear",

    "map.moon.aria": "Interactive map of the Moon",
    "map.mars.aria": "Interactive map of Mars",
    "map.grid": "Grid",
    "map.zoomIn": "Zoom in", "map.zoomOut": "Zoom out",
    "map.leafletTitle": "A JavaScript library for interactive maps",
    "map.attr.moon": 'Imagery: <a href="https://trek.nasa.gov/moon/" target="_blank" rel="noopener">NASA Moon Trek</a> (LRO WAC mosaic)',
    "map.attr.mars": 'Imagery: <a href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener">NASA Mars Trek</a> (Viking MDIM 2.1 color mosaic)',
    "map.tilesFail": "NASA Trek map tiles did not load (network, firewall or blocked host). Markers and coordinates still work on the grid. Open this site from a normal web server with internet access.",
    "map.noLeaflet": "The 2D map library (Leaflet) could not be loaded, so the 3D globe is shown instead. Check your connection to unpkg.com and reload the page.",

    "mode.aria": "Map mode", "mode.2d": "2D Map", "mode.3d": "3D Globe",
    "globe.aria": "Interactive 3D globe of {body}",
    "globe.hint": "Drag to rotate · right-drag or two fingers to move · scroll or pinch to zoom · click a marker or any point on the surface",
    "globe.zoomIn": "Zoom in", "globe.zoomOut": "Zoom out", "globe.reset": "Reset view",
    "globe.unsupported": "3D mode needs WebGL 2, which is not available in this browser or device. The 2D map stays active.",
    "globe.lost": "The graphics context was lost. Switched back to the 2D map.",
    "globe.texNasa": "Surface texture: NASA Trek mosaic.",
    "globe.texLoading": "Loading the NASA surface texture…",
    "globe.texFallback": "NASA surface texture could not be loaded (network or cross-origin restriction). The globe shows a stylized surface; markers and coordinates are exact.",
    "globe.point": "Surface point",
    "globe.lat": "Latitude", "globe.lon": "Longitude",
    "globe.nearest": "Nearest object", "globe.distance": "Distance",
    "globe.none": "No catalogued objects match the current filters.",
    "globe.open": "Open card", "globe.close": "Close",
    "globe.radiusNote": "Distance is measured along the surface using the mean radius of the body.",
    "dir.N": "N", "dir.S": "S", "dir.E": "E", "dir.W": "W",
    "unit.km": "km",

    "card.close": "Close",
    "tld.aria": "Mission Timeline",
    "tld.body": "Celestial body",
    "tld.from": "From year",
    "tld.to": "To year",
    "tld.viewAria": "Timeline view",
    "tld.view.line": "Timeline",
    "tld.view.list": "List",
    "tld.zin": "Zoom in",
    "tld.zout": "Zoom out",
    "tld.scrollAria": "Time axis of missions",
    "tld.count": "Missions shown: {n} of {m}",
    "tld.empty": "No missions match the filters.",
    "tld.hint": "Drag or swipe to move, Ctrl+scroll or pinch to zoom, click a mission.",
    "tld.note": "Only missions from this project's collection (hardware left on the Moon and Mars) are shown, not every mission in history. A missing date means it is not documented in the project data.",
    "mc.dates": "Dates",
    "mc.operating": "Operating",
    "mc.continues": "continues",
    "mc.datesNote": "Launch, landing and mission end are different events and are shown separately. A row appears only if the project data holds that date.",
    "mc.ach": "Key achievements",
    "mc.left": "Objects left behind",
    "mc.openCard": "Open object card",
    "mc.show2d": "Show on 2D map",
    "mc.show3d": "Show on 3D globe",
    "mc.photoNote": "Photographs come from the NASA Image and Video Library; captions are NASA's, in English.",
    "mc.noPhotos": "No photographs could be loaded for this mission.",
    "ba.open": "Before / After",
    "ba.title": "Before / After comparison",
    "ba.before": "Before",
    "ba.after": "After",
    "ba.modeSlider": "Slider",
    "ba.modeAria": "View mode",
    "ba.slider": "Comparison slider",
    "ba.sliderVal": "{p}% of the Before image shown",
    "ba.source": "Source",
    "ba.srcLib": "NASA Image and Video Library",
    "ba.fullscreen": "Full screen",
    "ba.exitFull": "Exit full screen",
    "ba.show3d": "Show on 3D map",
    "ba.details": "Object details",
    "ba.loading": "Searching the NASA archive for a matching pair…",
    "ba.none": "No matching pair was found in the NASA Image and Video Library for this object. Nothing is shown rather than a doubtful match.",
    "ba.fail": "The NASA archive could not be reached.",
    "ba.noBefore": "No mission-era image in the archive matched this object.",
    "ba.noAfter": "No later orbiter image (LRO, MRO, HiRISE) matched this object.",
    "ba.pickBefore": "Before candidates",
    "ba.pickAfter": "After candidates",
    "ba.warnTitle": "Read before comparing",
    "ba.warn": "The two images come from different instruments, positions, scales and resolutions and are NOT aligned. The slider is a visual aid, not a precise overlay.",
    "ba.warnDate": "Dates are the dates stored in NASA's metadata; for archive scans this can be a record date, not the exposure date.",
    "ba.single": "Only one side was found, so no comparison is possible.",
    "ba.gap": "Time between the two images: about {n} years.",
    "ba.basis": "Matched by name in NASA metadata: {t}. The place is not verified from coordinates.",
    "models.show": "Show 3D equipment models",
    "models.hide": "Hide 3D equipment models",
    "models.zoomHint": "Zoom in to see equipment models.",
    "models.note": "Models are schematic reconstructions at exaggerated scale, not photographs. Positions come from the project data.",
    "models.noteGlb": "Some models are loaded 3D files, the rest are schematic reconstructions; all are at exaggerated scale, not photographs. Positions come from the project data.",
    "k.model": "3D model",
    "model.kind": "Schematic reconstruction (not a photograph, not to scale)",
    "card.viewDetails": "View Details",
    "card.hideDetails": "Hide details",
    "card.explore3d": "Explore in 3D",
    "card.prev": "Previous object",
    "card.next": "Next object",
    "card.pos": "{i} of {n}",
    "card.navAria": "Move between objects",
    "k.period": "Operating period",
    "period.present": "present",
    "period.unknown": "not specified in project data",
    "card.purpose": "Purpose and significance",
    "card.objhist": "Object History",
    "card.archive": "Archive materials (video, audio)",
    "archive.loading": "Searching the NASA archive…",
    "archive.none": "No video or audio found for this query.",
    "archive.fail": "Archive materials could not be loaded.",
    "media.video": "video",
    "media.audio": "audio",
    "card.nasaOfficial": "Official NASA sources",
    "card.otherSources": "Other sources (partners, press, reference)",
    "card.nasaNone": "No NASA-domain source is listed for this object.",
    "card.nasaLib": "NASA Image and Video Library: search for this object",
    "lb.aria": "Photo viewer",
    "lb.close": "Close",
    "lb.prev": "Previous photo",
    "lb.next": "Next photo",
    "lb.open": "Open the NASA record",
    "lb.credit": "Caption and description are supplied by NASA.",
    "lb.noDesc": "No description supplied.",
    "card.pending": "Coordinate check pending",
    "card.pendingTitle": "Coordinate still needs to be checked against its source",
    "k.mission": "Mission", "k.agency": "Agency", "k.equipment": "Equipment",
    "k.launch": "Launch", "k.landing": "Landing", "k.impact": "Impact",
    "k.location": "Location", "k.coords": "Coordinates", "k.accuracy": "Accuracy", "k.status": "Status",
    "k.na": "n/a",
    "acc.measured": "measured", "acc.approx": "approximate", "acc.area": "region only",
    "card.history": "History", "card.why": "Why it is still there", "card.facts": "Verified facts",
    "card.timeline": "Mission timeline", "card.photos": "Archive photographs", "card.sources": "Sources",
    "tl.launch": "Launch", "tl.landing": "Landing", "tl.impact": "Impact", "tl.ops": "Mission operations", "tl.end": "Mission end", "tl.legacy": "Legacy",
    "card.cmp": "Add to comparison", "card.cmpOn": "✓ In comparison",
    "photos.loading": "Loading from the NASA Image and Video Library…",
    "photos.none": 'No images found. <a href="{url}" target="_blank" rel="noopener">Search the NASA Image Library</a>.',
    "photos.live": 'Live results from the NASA Image and Video Library for “{q}”. Check each caption before treating an image as this exact object. <a href="{url}" target="_blank" rel="noopener">More results</a>.',
    "photos.fail": 'Photos could not be loaded. <a href="{url}" target="_blank" rel="noopener">Open the NASA Image Library search</a>.',

    "cmp.title": "Compare missions", "cmp.close": "Close",
    "cmp.planet": "Planet", "cmp.mission": "Mission", "cmp.agency": "Agency", "cmp.equipment": "Equipment", "cmp.status": "Status",
    "cmp.launch": "Launch", "cmp.landing": "Landing", "cmp.end": "Mission end", "cmp.span": "Time between landing and end",
    "cmp.dist": "Distance driven (recorded)", "cmp.acc": "Location accuracy",
    "span.short": "less than a month", "span.years": "{y} years",

    "tlp.title": "Landings, in order",
    "tlp.lede": "Every object in the collection, sorted by landing date. Select one to fly to it.",
    "about.title": "How this collection is built",
    "about.lede": "Every object is a record in <code>js/data.js</code> with its coordinates, an accuracy level and links to the sources it came from.",
    "about.h.map": "What is on the map",
    "about.p.map": "{n} objects on the Moon and Mars. Each marker is a landing site, a parking position or an impact site. Markers never claim an exact position when only a region is known: those are drawn as diamonds and labelled “region only”.",
    "about.h.status": "Status is not the same as lost",
    "about.h.check": "Coordinates still to check before the demo",
    "about.none": "None.",
    "about.h.src": "Sources used",
    "about.h.svc": "Data services",
    "about.svc.maps": 'Basemaps: NASA <a href="https://trek.nasa.gov/" target="_blank" rel="noopener">Moon Trek and Mars Trek</a> WMTS tiles.',
    "about.svc.photos": 'Photographs: <a href="https://images.nasa.gov/" target="_blank" rel="noopener">NASA Image and Video Library</a> search API, loaded live.',
    "about.svc.lang": "Source titles are shown in their original language."
  };

  var cur = "en", listeners = [];

  function t(key, vars) {
    var s = (D[cur] || {})[key];
    if (s == null) s = D.en[key];
    if (s == null) s = key;
    if (vars) s = s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; });
    return s;
  }

  function apply(root) {
    root = root || document;
    var i, el, list, p, kv;
    list = root.querySelectorAll("[data-i18n]");
    for (i = 0; i < list.length; i++) list[i].textContent = t(list[i].getAttribute("data-i18n"));
    list = root.querySelectorAll("[data-i18n-html]");
    for (i = 0; i < list.length; i++) list[i].innerHTML = t(list[i].getAttribute("data-i18n-html"));
    list = root.querySelectorAll("[data-i18n-attr]");
    for (i = 0; i < list.length; i++) {
      el = list[i];
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        kv = pair.split(":");
        if (kv.length === 2) el.setAttribute(kv[0].trim(), t(kv[1].trim()));
      });
    }
  }

  function setLang(l, silent) {
    if (LANGS.indexOf(l) === -1) return;
    cur = l;
    document.documentElement.lang = l;
    document.title = t("doc.title");
    var md = document.querySelector('meta[name="description"]');
    if (md) md.setAttribute("content", t("doc.desc"));
    apply(document);
    if (silent) return;
    listeners.forEach(function (fn) { try { fn(l); } catch (e) { if (window.console) console.error(e); } });
  }

  window.I18N = {
    t: t, apply: apply, setLang: setLang, LANGS: LANGS,
    get lang() { return cur; },
    locale: function () { return LOCALE[cur]; },
    onChange: function (fn) { listeners.push(fn); },
    dict: D
  };
  document.documentElement.lang = cur;
})();
