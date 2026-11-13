/* FORGOTTEN RELICS — curated exhibition data (language-neutral part).
 *
 * Objects are referenced by their id in window.OBJECTS (js/data.js); names, missions and descriptions come from the
 * existing database and its translations. All new texts (stories, significance) live in js/relics.i18n.js.
 * Every date and number used in a story is listed with a source in that story's `src`.
 * Photographs are NOT stored: they are searched at run time in the NASA Image and Video Library and kept only if the
 * NASA metadata (title + description + keywords) matches every pattern in `must` (same rule as the Photo Archive).
 */
(function () {
  "use strict";

  var S = {
    nssdcApollo: { t: "NASA NSSDCA — Apollo lunar missions", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo.html" },
    lrv: { t: "NASA NSSDCA — The Apollo Lunar Roving Vehicle", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html" },
    a11i: { t: "NASA NSSDCA — Apollo 11 Lunar Landing Mission", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html" },
    plaque: { t: "NASA Science — Apollo 11 Plaque", u: "https://science.nasa.gov/resource/apollo-11-plaque/" },
    lroApollo: { t: "NASA SVS — New LRO Images Offer Sharper Views of Apollo 12, 14, and 17 Sites (2011)", u: "https://svs.gsfc.nasa.gov/10818/" },
    lroc14: { t: "LROC (ASU) — New View of Apollo 14", u: "https://www.lroc.asu.edu/images/285" },
    artemis: { t: "NASA — The Artemis Accords", u: "https://www.nasa.gov/artemis-accords/" },
    oneStep: { t: "Space.com — New law is first to protect Apollo sites (One Small Step Act, 2020)", u: "https://www.space.com/one-small-step-space-heritage-act.html" },
    alsep: { t: "Apollo Lunar Surface Journal (NASA) — ALSEP, 19 Nov 1969 – 30 Sep 1977", u: "https://www.nasa.gov/wp-content/uploads/static/history/alsj/HamishALSEP.html" },
    rps: { t: "NASA — Radioisotope Power Systems: Legacy Systems (SNAP-19, SNAP-27)", u: "https://science.nasa.gov/planetary-science/programs/radioisotope-power-systems/legacy-systems" },
    pse: { t: "NASA NTRS — Results From the Apollo Passive Seismic Experiment", u: "https://ntrs.nasa.gov/api/citations/19780005006/downloads/19780005006.pdf" },
    llr: { t: "NASA Goddard — Apollo reflectors continue to provide lunar laser ranging data", u: "https://earth.gsfc.nasa.gov/geo/projects/sgp/updates/reflectors-placed-moon-apollo-11-astronauts-50-years-ago-continue-provide" },
    lunokhod: { t: "Murphy et al., Icarus 211 (2011) — Laser Ranging to the Lost Lunokhod 1 Reflector (arXiv)", u: "https://arxiv.org/abs/1009.5720" },
    lunaUSSR: { t: "NASA NSSDCA — Soviet Lunar Missions", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunarussr.html" },
    surveyor3: { t: "NASA JPL — Surveyor 3 Camera Returned from the Moon", u: "https://www.jpl.nasa.gov/blog/2012/1/surveyor-3-camera-returned-from-the-moon" },
    golf: { t: "Smithsonian NASM (Google Arts & Culture) — Apollo 14 golf club head, replica", u: "https://artsandculture.google.com/asset/head-golf-club-apollo-14-replica/_wGsn5jayojp7w" },
    a17: { t: "NASA — Apollo 17", u: "https://www.nasa.gov/mission/apollo-17/" },
    spirit: { t: "NASA Science — Spirit", u: "https://science.nasa.gov/mission/mer-spirit/" },
    opp: { t: "NASA Science — Opportunity", u: "https://science.nasa.gov/mission/mer-opportunity/" },
    oppMap: { t: "NASA Photojournal — PIA23178: Opportunity’s Final Traverse Map", u: "https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/" },
    berries: { t: "NASA Astrobiology — Iron Blueberries (2004)", u: "https://astrobiology.nasa.gov/news/check-type-iron-blueberries/" },
    mpf: { t: "NASA Science — Mars Pathfinder", u: "https://science.nasa.gov/mission/mars-pathfinder/" },
    skycrane: { t: "NASA JPL — Here’s How Curiosity’s Sky Crane Changed the Way NASA Explores Mars (2024)", u: "https://www.jpl.nasa.gov/news/heres-how-curiositys-sky-crane-changed-the-way-nasa-explores-mars/" },
    viking: { t: "NASA NSSDCA — Viking Mission to Mars", u: "https://nssdc.gsfc.nasa.gov/planetary/viking.html" },
    phoenix: { t: "NASA Science — Phoenix", u: "https://science.nasa.gov/mission/phoenix/" },
    phxWater: { t: "NASA Astrobiology — Phoenix Confirms Martian Water, Mission Extended (2008)", u: "https://astrobiology.nasa.gov/news/phoenix-confirms-martian-water-mission-extended/" },
    phxDmg: { t: "NASA JPL — Phoenix Mars Lander Is Silent, New Image Shows Damage (2010)", u: "https://www.jpl.nasa.gov/news/phoenix-mars-lander-is-silent-new-image-shows-damage/" },
    insight: { t: "NASA Science — InSight", u: "https://science.nasa.gov/mission/insight/" },
    insightEnd: { t: "NASA JPL — NASA Retires InSight Mars Lander Mission After Years of Science (2022)", u: "https://www.jpl.nasa.gov/news/nasa-retires-insight-mars-lander-mission-after-years-of-science" },
    ingEnd: { t: "NASA — After Three Years on Mars, NASA’s Ingenuity Helicopter Mission Ends", u: "https://www.nasa.gov/news-release/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/" },
    zhurong: { t: "HiRISE (Univ. of Arizona / NASA) — Tianwen-1 lander and Zhurong rover (2021)", u: "https://www.uahirise.org/ESP_069665_2055" },
    beagle: { t: "ESA — Beagle-2 lander found on Mars (2015)", u: "https://sci.esa.int/web/mars-express/-/55263-beagle-2-lander-found-on-mars" }
  };

  /* Relics shown in the gallery: object id, photo search, sources for the "why it matters" text. */
  window.RELICS = [
    { id: "apollo-11-lm", q: "Apollo 11 lunar module Eagle", must: ["apollo 11"], src: [S.a11i, S.plaque] },
    { id: "apollo-12-lm", q: "Apollo 12 Surveyor 3", must: ["apollo 12", "surveyor"], src: [S.surveyor3] },
    { id: "surveyor-3", q: "Surveyor 3 Apollo 12", must: ["surveyor 3|surveyor iii"], src: [S.surveyor3] },
    { id: "apollo-14-lm", q: "Apollo 14 lunar surface", must: ["apollo 14"], src: [S.golf, S.llr, S.lroc14] },
    { id: "apollo-15-lrv", q: "Apollo 15 lunar roving vehicle", must: ["apollo 15", "rover|roving"], src: [S.lrv] },
    { id: "apollo-17-lm", q: "Apollo 17 lunar module Challenger", must: ["apollo 17"], src: [S.a17, S.lroApollo] },
    { id: "luna-16", q: "Luna 16", must: ["luna 16"], src: [S.lunaUSSR] },
    { id: "lunokhod-1", q: "Lunokhod 1", must: ["lunokhod"], src: [S.lunaUSSR, S.lunokhod] },
    { id: "viking-1", q: "Viking 1 lander Mars surface", must: ["viking"], src: [S.viking] },
    { id: "pathfinder", q: "Mars Pathfinder Sojourner", must: ["pathfinder|sojourner"], src: [S.mpf] },
    { id: "spirit", q: "Spirit rover Mars", must: ["spirit", "mars|rover"], src: [S.spirit] },
    { id: "opportunity", q: "Opportunity rover Mars", must: ["opportunity", "mars|rover"], src: [S.opp, S.oppMap] },
    { id: "phoenix", q: "Phoenix Mars lander", must: ["phoenix", "mars|lander"], src: [S.phxWater, S.phxDmg] },
    { id: "insight", q: "InSight Mars lander", must: ["insight", "mars|lander"], src: [S.insight, S.insightEnd] },
    { id: "ingenuity", q: "Ingenuity Mars helicopter", must: ["ingenuity"], src: [S.ingEnd] }
  ];

  /* Stories. tl: [date, n] → text key rl.st.<id>.t<n>; specs: n → keys rl.st.<id>.k<n> / .v<n>;
   * img: photo searches for "related historical images"; rel: related objects (all exist in window.OBJECTS). */
  window.RELIC_STORIES = [
    {
      id: "lunar", body: "moon", hero: "apollo-11-lm", chapters: 3,
      rel: ["apollo-11-lm", "apollo-12-lm", "apollo-14-lm", "apollo-15-lm", "apollo-16-lm", "apollo-17-lm", "apollo-15-lrv", "apollo-16-lrv", "apollo-17-lrv"],
      tl: [["1969-07-20", 1], ["1969-11-19", 2], ["1971-07-30", 3], ["1972-12-11", 4], ["1977-09-30", 5], ["2011-09", 6], ["2020-12-31", 7]],
      specs: 5,
      img: [{ q: "Apollo 11 lunar module Eagle", must: ["apollo 11"] }, { q: "Apollo 15 lunar roving vehicle", must: ["apollo 15", "rover|roving"] }, { q: "LRO Apollo 17 landing site", must: ["apollo 17", "lro|lunar reconnaissance"] }],
      src: [S.nssdcApollo, S.a11i, S.plaque, S.lrv, S.alsep, S.lroApollo, S.artemis, S.oneStep]
    },
    {
      id: "rovers", body: "mars", hero: "opportunity", chapters: 2,
      rel: ["spirit", "opportunity"],
      tl: [["2004-01-04", 1], ["2004-01-25", 2], ["2004-03", 3], ["2009-05-01", 4], ["2011-05-25", 5], ["2018-06-10", 6], ["2019-02-13", 7]],
      specs: 5,
      img: [{ q: "Spirit rover Gusev", must: ["spirit", "mars|rover"] }, { q: "Opportunity rover Meridiani", must: ["opportunity", "mars|rover"] }, { q: "Opportunity Endeavour crater", must: ["opportunity", "endeavour"] }],
      src: [S.spirit, S.opp, S.oppMap, S.berries]
    },
    {
      id: "pathfinder", body: "mars", hero: "pathfinder", chapters: 2,
      rel: ["pathfinder", "spirit", "opportunity", "curiosity"],
      tl: [["1996-12-04", 1], ["1997-07-04", 2], ["1997-07-05", 3], ["1997-09-27", 4], ["2004-01", 5], ["2012-08", 6]],
      specs: 4,
      img: [{ q: "Mars Pathfinder Sojourner", must: ["pathfinder|sojourner"] }, { q: "Sojourner rover rock", must: ["sojourner"] }, { q: "Mars Pathfinder airbags", must: ["pathfinder", "airbag"] }],
      src: [S.mpf, S.skycrane]
    },
    {
      id: "experiments", body: "both", hero: "apollo-15-lm", chapters: 3,
      rel: ["apollo-11-lm", "apollo-12-lm", "apollo-15-lm", "lunokhod-1", "phoenix", "insight"],
      tl: [["1969-07-21", 1], ["1969-11-19", 2], ["1970-11-17", 3], ["1977-09-30", 4], ["2008-07-31", 5], ["2010-04-22", 6], ["2018-11-26", 7], ["2022-12-15", 8]],
      specs: 4,
      img: [{ q: "Apollo lunar surface experiments package", must: ["alsep|experiments package"] }, { q: "Apollo laser ranging retroreflector", must: ["retroreflector|retro-reflector|laser ranging"] }, { q: "InSight seismometer", must: ["insight", "seismometer|seis"] }],
      src: [S.alsep, S.rps, S.pse, S.llr, S.lunokhod, S.lunaUSSR, S.phxWater, S.insight, S.insightEnd]
    },
    {
      id: "descent", body: "both", hero: "viking-1", chapters: 3,
      rel: ["apollo-11-lm", "viking-1", "pathfinder", "phoenix", "insight", "curiosity", "perseverance"],
      tl: [["1969-07-20", 1], ["1976-07-20", 2], ["1997-07-04", 3], ["2008-05-25", 4], ["2012-08", 5], ["2015-01", 6], ["2021-02-18", 7]],
      specs: 4,
      img: [{ q: "Viking lander Mars", must: ["viking"] }, { q: "Curiosity sky crane", must: ["sky crane"] }, { q: "Perseverance descent parachute", must: ["perseverance", "descent|parachute|landing"] }],
      src: [S.skycrane, S.viking, S.mpf, S.phoenix, S.insight, S.lroc14, S.zhurong, S.beagle]
    }
  ];
})();
