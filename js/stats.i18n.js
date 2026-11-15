/* Statistics Dashboard: interface texts (English). Merged into the main dictionary; load after i18n.js. */
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
  };
  ["en"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
