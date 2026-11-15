/* Knowledge Quiz — question bank (language-neutral part).
 * Abandoned but not Forgotten — NASA Space Apps 2026.
 *
 * Every question text lives in js/quiz.questions.i18n.js under flat keys:
 *   quiz.q.<id>        — question
 *   quiz.q.<id>.o0..o3 — options (multiple choice). AUTHORING RULE: o0 is ALWAYS the correct one,
 *                        the module shuffles options at runtime.
 *   quiz.q.<id>.ex     — short explanation shown after the answer
 * True/false questions ("tf") have no options keys; `ans` holds the correct boolean.
 *
 * cat:  apollo | lunar | mars | rovers | equipment | abandoned | discoveries | archaeology
 * body: moon | mars | both   (filter Moon / Mars / All; "both" appears under Moon and Mars)
 * diff: 1 easy | 2 medium | 3 hard
 * src:  sources of the historical fact (title is shown as-is, it is a proper name of the page)
 *
 * Facts were checked against the listed pages in November 2026. Nothing here is computed from
 * window.OBJECTS, so the quiz does not change the existing database.
 */
(function () {
  'use strict';

  var S = {
    a11:      { t: 'NASA — Apollo 11', u: 'https://www.nasa.gov/mission/apollo-11/' },
    a11i:     { t: 'NASA NSSDCA — Apollo 11 Lunar Landing Mission', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo11info.html' },
    a12i:     { t: 'NASA NSSDCA — Apollo 12 Lunar Landing Mission', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo12info.html' },
    a15i:     { t: 'NASA NSSDCA — Apollo 15 Lunar Landing Mission', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo15info.html' },
    a13acc:   { t: 'NASA NSSDCA — Apollo 13 accident', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/ap13acc.html' },
    a13:      { t: 'NASA — Apollo 13', u: 'https://www.nasa.gov/mission/apollo-13/' },
    a17:      { t: 'NASA — Apollo 17', u: 'https://www.nasa.gov/mission/apollo-17/' },
    apolloList: { t: 'NASA NSSDCA — Apollo missions', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo.html' },
    lrv:      { t: 'NASA NSSDCA — The Apollo Lunar Roving Vehicle', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html' },
    alsep:    { t: 'Apollo Lunar Surface Journal (NASA) — ALSEP, 19 Nov 1969 – 30 Sep 1977', u: 'https://www.nasa.gov/wp-content/uploads/static/history/alsj/HamishALSEP.html' },
    pse:      { t: 'NASA NTRS — Results From the Apollo Passive Seismic Experiment (Latham et al.)', u: 'https://ntrs.nasa.gov/api/citations/19780005006/downloads/19780005006.pdf' },
    rps:      { t: 'NASA — Radioisotope Power Systems: Legacy Systems (SNAP-19, SNAP-27)', u: 'https://science.nasa.gov/planetary-science/programs/radioisotope-power-systems/legacy-systems' },
    mmrtg:    { t: 'NASA — MMRTG fact sheet', u: 'https://science.nasa.gov/wp-content/uploads/2024/02/mmrtg-factsheet-updated-5-18-20-1.pdf' },
    llr:      { t: 'NASA Goddard — Apollo reflectors continue to provide lunar laser ranging data', u: 'https://earth.gsfc.nasa.gov/geo/projects/sgp/updates/reflectors-placed-moon-apollo-11-astronauts-50-years-ago-continue-provide' },
    golf:     { t: 'Smithsonian NASM (Google Arts & Culture) — Apollo 14 golf club head, replica', u: 'https://artsandculture.google.com/asset/head-golf-club-apollo-14-replica/_wGsn5jayojp7w' },
    genesis:  { t: 'NASA JSC History — Apollo 15 brings back 4 billion-year-old moon rock', u: 'https://historycollection.jsc.nasa.gov/JSCHistoryPortal/history/special_events/Features/Apollo15.htm' },
    lcross:   { t: 'NASA Science — LCROSS', u: 'https://science.nasa.gov/mission/lcross/' },
    lroApollo:{ t: 'NASA SVS — New LRO Images Offer Sharper Views of Apollo 12, 14, and 17 Sites', u: 'https://svs.gsfc.nasa.gov/10818/' },
    lroc14:   { t: 'LROC (ASU) — New View of Apollo 14', u: 'https://www.lroc.asu.edu/images/285' },
    surveyor3:{ t: 'NASA JPL — Surveyor 3 Camera Returned from the Moon', u: 'https://www.jpl.nasa.gov/blog/2012/1/surveyor-3-camera-returned-from-the-moon' },
    plaque:   { t: 'NASA Science — Apollo 11 Plaque', u: 'https://science.nasa.gov/resource/apollo-11-plaque/' },
    lunaUSSR: { t: 'NASA NSSDCA — Soviet Lunar Missions', u: 'https://nssdc.gsfc.nasa.gov/planetary/lunar/lunarussr.html' },
    change4:  { t: 'Eos (AGU) — Lander Gives First Look at Moon’s Farside', u: 'https://eos.org/articles/lander-gives-first-look-at-moons-farside' },
    ch3:      { t: 'Space.com — Chandrayaan-3 becomes 1st probe to land near lunar south pole', u: 'https://www.space.com/india-chandrayaan-3-moon-landing-success' },
    mariner4: { t: 'NASA NSSDCA — Mariner 4', u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1964-077A' },
    mariner9: { t: 'NASA NSSDCA — Mariner 9', u: 'https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-051A' },
    mars3:    { t: 'HiRISE (Univ. of Arizona / NASA) — Could This Be the Soviet Mars 3 Lander?', u: 'https://hirise.lpl.arizona.edu/ESP_031036_1345' },
    viking:   { t: 'NASA NSSDCA — Viking Mission to Mars', u: 'https://nssdc.gsfc.nasa.gov/planetary/viking.html' },
    ingEnd:   { t: 'NASA — After Three Years on Mars, NASA’s Ingenuity Helicopter Mission Ends', u: 'https://www.nasa.gov/news-release/after-three-years-on-mars-nasas-ingenuity-helicopter-mission-ends/' },
    insight:  { t: 'NASA Science — InSight', u: 'https://science.nasa.gov/mission/insight/' },
    mpf:      { t: 'NASA Science — Mars Pathfinder', u: 'https://science.nasa.gov/mission/mars-pathfinder/' },
    m2020:    { t: 'NASA Science — Mars 2020 Perseverance', u: 'https://science.nasa.gov/mission/mars-2020-perseverance/' },
    msl:      { t: 'NASA Science — Curiosity', u: 'https://science.nasa.gov/mission/msl-curiosity/' },
    opp:      { t: 'NASA Science — Opportunity', u: 'https://science.nasa.gov/mission/mer-opportunity/' },
    oppMap:   { t: 'NASA Photojournal — PIA23178: Opportunity’s Final Traverse Map', u: 'https://science.nasa.gov/photojournal/opportunitys-final-traverse-map/' },
    spirit:   { t: 'NASA Science — Spirit', u: 'https://science.nasa.gov/mission/mer-spirit/' },
    zhurong:  { t: 'HiRISE (Univ. of Arizona / NASA) — ESP_069665_2055, Tianwen-1 lander and Zhurong rover', u: 'https://www.uahirise.org/ESP_069665_2055' },
    phxWater: { t: 'NASA Astrobiology — Phoenix Confirms Martian Water, Mission Extended', u: 'https://astrobiology.nasa.gov/news/phoenix-confirms-martian-water-mission-extended/' },
    phxDmg:   { t: 'NASA JPL — Phoenix Mars Lander Is Silent, New Image Shows Damage', u: 'https://www.jpl.nasa.gov/news/phoenix-mars-lander-is-silent-new-image-shows-damage/' },
    berries:  { t: 'NASA Astrobiology — Iron Blueberries (2004)', u: 'https://astrobiology.nasa.gov/news/check-type-iron-blueberries/' },
    ykb:      { t: 'NASA JPL — NASA Rover Finds Conditions Once Suited for Ancient Life on Mars', u: 'https://www.jpl.nasa.gov/news/nasa-rover-finds-conditions-once-suited-for-ancient-life-on-mars/' },
    moxie:    { t: 'NASA — Oxygen-Generating Experiment MOXIE Completes Mars Mission', u: 'https://www.nasa.gov/solar-system/nasas-oxygen-generating-experiment-moxie-completes-mars-mission/' },
    beagle:   { t: 'ESA — Beagle-2 lander found on Mars', u: 'https://sci.esa.int/web/mars-express/-/55263-beagle-2-lander-found-on-mars' },
    hiBeagle: { t: 'HiRISE (Univ. of Arizona / NASA) — Finding Beagle 2', u: 'https://hirise.lpl.arizona.edu/ESP_039308_1915' },
    artemis:  { t: 'NASA — The Artemis Accords', u: 'https://www.nasa.gov/artemis-accords/' }
  };

  function q(id, cat, body, diff, src, extra) {
    var o = { id: id, cat: cat, body: body, diff: diff, type: 'mc', src: src };
    if (extra) { for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) o[k] = extra[k]; } }
    return o;
  }
  function tf(id, cat, body, diff, ans, src) {
    return { id: id, cat: cat, body: body, diff: diff, type: 'tf', ans: !!ans, src: src };
  }

  window.QUIZ_CATEGORIES = ['apollo', 'lunar', 'mars', 'rovers', 'equipment', 'abandoned', 'discoveries', 'archaeology'];

  window.QUIZ_QUESTIONS = [
    /* 1. Apollo Missions */
    q('ap_a11_date', 'apollo', 'moon', 1, [S.a11i, S.apolloList]),
    q('ap_eagle',    'apollo', 'moon', 1, [S.a11i, S.a12i, S.a15i]),
    q('ap_mare',     'apollo', 'moon', 1, [S.a11i, S.a11, S.a12i]),
    q('ap_13',       'apollo', 'moon', 1, [S.a13acc, S.a13]),
    q('ap_walkers',  'apollo', 'moon', 2, [S.apolloList]),
    q('ap_last',     'apollo', 'moon', 2, [S.a17]),
    tf('ap_lrv_tf',  'apollo', 'moon', 2, false, [S.lrv]),
    q('ap_schmitt',  'apollo', 'moon', 3, [S.a17]),

    /* 2. Lunar Exploration */
    q('lu_ch3',      'lunar', 'moon', 1, [S.ch3]),
    q('lu_luna2',    'lunar', 'moon', 2, [S.lunaUSSR]),
    q('lu_luna9',    'lunar', 'moon', 2, [S.lunaUSSR]),
    q('lu_change4',  'lunar', 'moon', 2, [S.change4]),
    q('lu_luna16',   'lunar', 'moon', 3, [S.lunaUSSR]),
    q('lu_luna17',   'lunar', 'moon', 3, [S.lunaUSSR]),

    /* 3. Mars Exploration */
    q('me_ingenuity','mars', 'mars', 1, [S.ingEnd]),
    q('me_mariner4', 'mars', 'mars', 2, [S.mariner4]),
    q('me_viking1',  'mars', 'mars', 2, [S.viking]),
    q('me_insight',  'mars', 'mars', 2, [S.insight]),
    q('me_mariner9', 'mars', 'mars', 3, [S.mariner9]),
    q('me_mars3',    'mars', 'mars', 3, [S.mars3]),

    /* 4. Mars Rovers */
    q('ro_sojourner','rovers', 'mars', 1, [S.mpf]),
    q('ro_persev',   'rovers', 'mars', 1, [S.m2020]),
    q('ro_curiosity','rovers', 'mars', 2, [S.msl, S.ykb]),
    q('ro_opp_storm','rovers', 'mars', 2, [S.opp]),
    q('ro_opp_dist', 'rovers', 'mars', 3, [S.opp]),
    q('ro_spirit',   'rovers', 'mars', 3, [S.spirit]),
    q('ro_zhurong',  'rovers', 'mars', 3, [S.zhurong]),

    /* 5. Spacecraft and Equipment */
    q('eq_mer_power','equipment', 'mars', 1, [S.opp]),
    q('eq_msl_power','equipment', 'mars', 1, [S.mmrtg]),
    q('eq_lrv_power','equipment', 'moon', 2, [S.lrv]),
    q('eq_lm_stage', 'equipment', 'moon', 2, [S.lroc14, S.plaque]),
    q('eq_alsep_power','equipment', 'moon', 3, [S.rps]),
    q('eq_viking_rtg','equipment', 'mars', 3, [S.rps]),

    /* 6. Abandoned Space Technology */
    q('ab_lrv_count','abandoned', 'moon', 1, [S.lrv, S.lroApollo]),
    q('ab_golf',     'abandoned', 'moon', 1, [S.golf]),
    q('ab_retro',    'abandoned', 'moon', 2, [S.llr]),
    q('ab_ingenuity','abandoned', 'mars', 2, [S.ingEnd]),
    q('ab_opp_rest', 'abandoned', 'mars', 2, [S.oppMap, S.opp]),
    q('ab_alsep_off','abandoned', 'moon', 3, [S.alsep]),
    q('ab_phoenix',  'abandoned', 'mars', 3, [S.phxDmg]),

    /* 7. Scientific Discoveries */
    q('di_phx_water','discoveries', 'mars', 1, [S.phxWater]),
    q('di_lcross',   'discoveries', 'moon', 2, [S.lcross]),
    q('di_berries',  'discoveries', 'mars', 2, [S.berries]),
    q('di_ykb',      'discoveries', 'mars', 2, [S.ykb]),
    q('di_moxie',    'discoveries', 'mars', 2, [S.moxie]),
    q('di_quakes',   'discoveries', 'moon', 2, [S.pse]),
    q('di_genesis',  'discoveries', 'moon', 3, [S.genesis]),

    /* 8. Space Archaeology */
    tf('ar_tracks_tf','archaeology', 'moon', 1, true, [S.lroApollo]),
    q('ar_lro',      'archaeology', 'moon', 2, [S.lroApollo]),
    q('ar_plaque',   'archaeology', 'moon', 2, [S.plaque]),
    q('ar_hirise',   'archaeology', 'mars', 2, [S.hiBeagle, S.phxDmg]),
    q('ar_artemis',  'archaeology', 'both', 2, [S.artemis]),
    q('ar_surveyor3','archaeology', 'moon', 3, [S.surveyor3]),
    q('ar_beagle2',  'archaeology', 'mars', 3, [S.beagle])
  ];
})();
