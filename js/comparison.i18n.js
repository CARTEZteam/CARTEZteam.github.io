/* Mission Comparison: interface and content texts (English). Merged into the main dictionary; load after i18n.js. */
(function () {
  "use strict";
  var D = window.I18N && window.I18N.dict; if (!D) return;
  var X = {
    en: {
      "nav.comparison": "Mission Comparison",
      "mc.title": "Mission Comparison",
      "mc.lede": "Pick two to four missions from the project catalogue and compare them side by side. Where a value is missing or not confirmed by a source, the table says \"No data\".",
      "mc.banner": "Not every number is comparable. Masses and sizes are defined differently by each source (launch, landed, dry, rover only), so each value carries its own label and unit: compare only values with the same label. The catalogue holds 26 objects and is not a complete census of missions.",
      "mc.nodata": "No data",
      "mc.mode.sel": "Compare missions", "mc.mode.body": "Moon vs Mars", "mc.mode": "Comparison mode",
      "mc.f.planet": "Body", "mc.f.type": "Equipment type", "mc.f.from": "Launch year from", "mc.f.to": "to", "mc.f.all": "All", "mc.reset": "Reset comparison",
      "mc.count": "{n} missions match; {s} selected (max 4)",
      "mc.pick": "Missions", "mc.hintMore": "Select at least two missions to compare.", "mc.max": "Four missions are selected: clear one to add another.",
      "mc.charts": "Charts", "mc.table": "Comparison table", "mc.sources": "Sources",
      "mc.r.name": "Mission", "mc.r.body": "Body", "mc.r.agency": "Space agency", "mc.r.launch": "Launch year", "mc.r.landing": "Landing date",
      "mc.r.duration": "Operating duration", "mc.r.type": "Spacecraft type", "mc.r.mass": "Equipment mass", "mc.r.dims": "Dimensions",
      "mc.r.tasks": "Main scientific tasks", "mc.r.ach": "Main achievements", "mc.r.end": "Why the mission ended", "mc.r.left": "Components left behind",
      "mc.h.duration": "Counted from landing to the end of operations in the project data. Crewed Apollo surface stays and robotic missions are not comparable; where the end date is not recorded the table says \"No data\".",
      "mc.h.mass": "Each value measures something different (see its label). Compare only identical labels.",
      "mc.h.dims": "Sizes are defined differently (with or without arm, panels or landing gear); compare only identical labels.",
      "mc.h.left": "Counts objects catalogued in this project whose condition is not \"Operational\"; it is not a complete inventory of what each mission left.",
      "mc.h.ach": "From the project's object records.",
      "mc.h.end": "From the project's equipment-condition records; a mission end is not a claim of destruction.",
      "mc.m.launch": "Launch mass (whole spacecraft)", "mc.m.landed": "Landing mass (spacecraft at landing)", "mc.m.dry": "Lander dry mass",
      "mc.m.lander": "Lander mass", "mc.m.rover": "Rover mass", "mc.m.roverDry": "Rover dry mass", "mc.m.desc": "Descent stage mass incl. propellant (LM design)",
      "mc.m.note.lunok": "The article body gives 840 kg for the rover; the infobox gives 756 kg.",
      "mc.m.note.lm": "Generic Lunar Module design; flight-specific values are not in the sources used.",
      "mc.m.note.ls": "Mass of the whole launch stack: lander, aeroshell, parachutes and cruise stage.",
      "mc.d.len": "Length", "mc.d.lenArm": "Length (without arm)", "mc.d.wid": "Width", "mc.d.hgt": "Height", "mc.d.hgtMast": "Height (to top of mast)",
      "mc.d.span": "Span with solar arrays deployed", "mc.d.lenArr": "Length with solar panels deployed", "mc.d.deck": "Deck diameter", "mc.d.deckW": "Deck width",
      "mc.d.hgtLegs": "Height (legs to deck top)", "mc.d.rotor": "Rotor span (Ingenuity)", "mc.d.hgtIng": "Height (Ingenuity)", "mc.d.lwh": "Length × width × height (order as listed)",
      "mc.d.hgtDesc": "Descent stage height", "mc.d.gear": "Width with landing gear extended",
      "mc.u.kg": "kg", "mc.u.m": "m", "mc.u.day": "days", "mc.u.yr": "years", "mc.about": "about",
      "mc.dur.ongoing": "{n} days as of {d} (still operating)", "mc.dur.days": "{n} days", "mc.dur.approx": "about {n} days (end date known to the month)",
      "mc.left.none": "0 (the rover is still operating)", "mc.left.n": "{n} objects", "mc.cond": "Condition",
      "mc.photo": "NASA image", "mc.photoNote": "Photos are found live in the NASA Image and Video Library by a search term; a photo may show a different vehicle of the same programme.",
      "mc.photoLoad": "Loading photo…", "mc.photoNone": "No photo available", "mc.showMap": "Map", "mc.show3d": "3D", "mc.objects": "Objects",
      "mc.ch.launch": "Launch mass (kg)", "mc.ch.lander": "Lander mass (kg, as defined by each source)", "mc.ch.rover": "Rover mass (kg)", "mc.ch.dur": "Operating duration (days)",
      "mc.ch.none": "No selected mission has this value.", "mc.ch.tl": "Launch → landing → end of operations",
      "mc.agg.title": "Moon vs Mars (in this catalogue)", "mc.agg.note": "Counts are for the project's catalogue after the filters above, not for all missions ever flown.",
      "mc.agg.missions": "Missions", "mc.agg.objects": "Catalogued objects", "mc.agg.agencies": "Space agencies", "mc.agg.first": "First landing", "mc.agg.last": "Latest landing",
      "mc.agg.types": "Equipment types", "mc.agg.cond": "Equipment condition", "mc.agg.mass": "Missions with a confirmed mass", "mc.agg.chart": "Condition of catalogued objects",
      "mc.src.data": "Project data (js/data.js and the equipment-condition records; each object card lists its own sources)",
      "mc.t.surv3": "Test a soil-sampling scoop on an extendable arm, dig trenches in the lunar soil and photograph the samples and surroundings.",
      "mc.t.luna16": "Lunar sample return (101 g of lunar soil), plus gravity studies from lunar orbit, imaging, and radiation and temperature monitoring.",
      "mc.t.lk1": "Lunokhod 1 tested lunar soil for density and mechanical properties and carried an X-ray spectrometer, an X-ray telescope, cosmic-ray detectors and a laser retroreflector; it returned images.",
      "mc.t.c3": "Three goals: land safely and softly on the Moon, demonstrate the rover driving on the surface, and run experiments on lunar materials.",
      "mc.t.viking": "Biology experiments searching for evidence of life, a gas chromatograph-mass spectrometer for organic compounds, an X-ray fluorescence spectrometer, pressure, temperature and wind sensors, a seismometer and cameras."
    },
  };
  ["en"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
