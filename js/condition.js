/* OBJECT STATUS: curated equipment-condition records + interface texts (English).
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
  };
  ["en"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
