/*
 * ABANDONED BUT NOT FORGOTTEN: object database (hand-curated, source-referenced)
 *
 * Conventions
 *  - lat: degrees north (+) / south (-).  lon: degrees EAST, range -180..180
 *    (Mars sources that give 0..360 E were converted by subtracting 360).
 *  - accuracy.level:
 *      "measured" = coordinate published from orbital imagery or a mission table
 *      "approx"   = published values exist but sources differ or are rounded
 *      "area"     = marker shows a region / landing area, NOT an exact position
 *  - coordChecked: true  -> the coordinate was found in the cited source while building this data set
 *                  false -> coordinate comes from general mission documentation and still needs a
 *                           check against the cited source before the final demo (shown in the UI)
 *  - status: "left" (hardware deliberately left behind after use), "active" (still operating),
 *            "ended" (mission over, hardware stays where it stopped), "impact" (deliberate impact / debris site)
 *  - Dates are ISO ("YYYY-MM-DD" or "YYYY-MM"). Anything not confirmed is null and is hidden in the UI.
 */
(function () {
  const S = {
    nssdcApollo: { t: "NASA NSSDCA: Apollo Lunar Landings 1969-1972", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html" },
    nssdcSites: { t: "NASA NSSDCA: Apollo Landing Site Coordinates", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html" },
    nssdcTable: { t: "NASA NSSDCA: Table of Anthropogenic Impacts and Spacecraft on the Moon", u: "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_artifact_impacts.html" },
    lroc: { t: "LROC / ASU: 2016 Coordinates of Human Features on the Moon (PDF)", u: "https://www.lroc.asu.edu/data/support/downloads/2016_LROC_Coordinates_of_Human_Features.pdf" },
    isro: { t: "ISRO: Chandrayaan-3 mission summary", u: "https://www.isro.gov.in/NSPD2025/" },
    planetary: { t: "The Planetary Society: Mars landing site map (Lakdawalla)", u: "https://www.planetary.org/space-images/mars_landing_site_map_lakdawalla" },
    ode: { t: "Mars ODE: existing landing sites (WUSTL / NASA PDS)", u: "https://ode.rsl.wustl.edu/mars/pagehelp/Content/Missions_Instruments/Landing_Sites.htm" },
    viking: { t: "NASA NSSDCA: Viking mission to Mars", u: "https://nssdc.gsfc.nasa.gov/planetary/viking.html" },
    marsList: { t: "List of artificial objects on Mars (summary table, cites NSSDC)", u: "https://en.wikipedia.org/wiki/List_of_artificial_objects_on_Mars" },
    ingenuity: { t: "NASA/JPL via Phys.org: Ingenuity mission ends (25 Jan 2024)", u: "https://phys.org/news/2024-01-years-mars-nasa-ingenuity-helicopter.html" },
    marsLanding: { t: "NASA Science: Mars landing sites map", u: "https://science.nasa.gov/image-detail/marslandingsites-1600/" },
    mars2020: { t: "NASA: Mars 2020 Perseverance mission", u: "https://www.nasa.gov/missions/mars-2020-perseverance/" }
  };

  // ---- helpers for the six Apollo landings -------------------------------------------------
  function apollo(n, lm, site, lat, lon, launch, landing, extra) {
    return Object.assign({
      id: "apollo-" + n + "-lm",
      name: "Apollo " + n + " Lunar Module descent stage (" + lm + ")",
      mission: "Apollo " + n,
      planet: "moon",
      lat: lat, lon: lon,
      site: site,
      agency: "NASA (USA)",
      type: "Apollo mission hardware",
      status: "left",
      launch: launch, landing: landing, end: landing,
      accuracy: { level: "measured", note: "Lunar Module position from LRO narrow-angle camera images (LROC), published uncertainty of a few metres." },
      coordChecked: true,
      desc: "The descent stage of the Apollo " + n + " Lunar Module (" + lm + ") stands where the crew landed in " + site + ". It served as the launch platform for the ascent stage and remains on the surface together with the science equipment and tools the crew left there.",
      why: "Only the ascent stage carried the crew and the samples back to lunar orbit. The descent stage was the launch platform and stayed on the surface by design.",
      sources: [S.nssdcApollo, S.lroc, S.nssdcSites],
      imageQuery: "Apollo " + n + " landing site LRO " + lm
    }, extra);
  }

  function lrv(n, lat, lon, km, landing, site) {
    return {
      id: "apollo-" + n + "-lrv",
      name: "Apollo " + n + " Lunar Roving Vehicle",
      mission: "Apollo " + n,
      planet: "moon",
      lat: lat, lon: lon,
      site: site,
      agency: "NASA (USA)",
      type: "Lunar rover",
      status: "left",
      launch: null, landing: landing, end: landing,
      accuracy: { level: "measured", note: "Parked position of the rover from LRO narrow-angle camera images (LROC)." },
      coordChecked: true,
      distanceKm: km,
      desc: "The battery-powered Lunar Roving Vehicle carried two astronauts and their tools across the " + site + " region. After the last moonwalk it was parked and left on the surface.",
      why: "The crew returned in the ascent stage of the Lunar Module, which could carry only the astronauts and the lunar samples, so the rover stayed behind.",
      facts: ["Distance driven by the crew during all moonwalks of the mission: " + km + " km (NASA NSSDCA Apollo table, column 'Traverse')."],
      sources: [S.lroc, S.nssdcApollo],
      imageQuery: "Apollo " + n + " lunar roving vehicle"
    };
  }

  const OBJECTS = [
    // ============================== MOON ==============================
    apollo(11, "Eagle", "Mare Tranquillitatis", 0.67416, 23.47314, "1969-07-16", "1969-07-20", {
      facts: [
        "First crewed landing on the Moon (NSSDCA table).",
        "LROC measured the Lunar Module at 0.67416 N, 23.47314 E with 0.3 m uncertainty."
      ],
      timeline: { launch: "1969-07-16", landing: "1969-07-20", legacy: "The descent stage and the Apollo 11 science equipment remain at Tranquility Base." }
    }),
    apollo(12, "Intrepid", "Oceanus Procellarum", -3.0128, -23.4219, "1969-11-14", "1969-11-19", {
      facts: [
        "LROC longitude 336.5781 E equals 23.4219 W.",
        "The crew walked to the Surveyor 3 spacecraft that had landed in the same area in 1967."
      ],
      timeline: { launch: "1969-11-14", landing: "1969-11-19", legacy: "Parts of Surveyor 3 were brought back to Earth by this crew." }
    }),
    apollo(14, "Antares", "Fra Mauro", -3.64589, -17.47194, "1971-01-31", "1971-02-05", {
      facts: [
        "NSSDCA records that the Antares ascent stage was crashed into the Moon on 7 February 1971 at about 3.42 S, 19.67 W.",
        "LROC longitude 342.52806 E equals 17.47194 W."
      ],
      timeline: { launch: "1971-01-31", landing: "1971-02-05", legacy: "Seismometers placed by the crew recorded the later impact of the ascent stage." }
    }),
    apollo(15, "Falcon", "Hadley Rille", 26.13239, 3.6333, "1971-07-26", "1971-07-30", {
      facts: ["First mission to use the Lunar Roving Vehicle; the rover is parked roughly 130 m from the Lunar Module (computed from the LROC positions)."],
      timeline: { launch: "1971-07-26", landing: "1971-07-30", legacy: "Landing area at the edge of Hadley Rille in the Apennine mountains." }
    }),
    apollo(16, "Orion", "Descartes Highlands", -8.9734, 15.5011, "1972-04-16", "1972-04-20", {
      facts: ["Only Apollo landing in the lunar highlands (Descartes).", "LROC elevation of the Lunar Module is about 8 m (mean-Moon datum)."],
      timeline: { launch: "1972-04-16", landing: "1972-04-20", legacy: "Highland samples returned to Earth, hardware left at Descartes." }
    }),
    apollo(17, "Challenger", "Taurus-Littrow valley", 20.1911, 30.7723, "1972-12-07", "1972-12-11", {
      facts: [
        "Last crewed landing on the Moon to date (1972).",
        "NSSDCA records that the Challenger ascent stage hit the Moon on 15 December 1972 near 19.97 N, 30.49 E."
      ],
      timeline: { launch: "1972-12-07", landing: "1972-12-11", legacy: "Last footprints of the Apollo program." }
    }),

    lrv(15, 26.13174, 3.63803, 27.9, "1971-07-30", "Hadley Rille"),
    lrv(16, -8.9729, 15.5037, 27.0, "1972-04-20", "Descartes Highlands"),
    lrv(17, 20.1896, 30.7769, 35.0, "1972-12-11", "Taurus-Littrow valley"),

    {
      id: "surveyor-3", name: "Surveyor 3 lander", mission: "Surveyor 3", planet: "moon",
      lat: -3.0128, lon: -23.4219,
      site: "Oceanus Procellarum (inside a crater near the Apollo 12 landing site)",
      agency: "NASA (USA)", type: "Lunar lander", status: "ended",
      launch: "1967-04-17", landing: "1967-04-20", end: null,
      accuracy: { level: "area", note: "Marker placed at the Apollo 12 landing point. Surveyor 3 sits a short walk away from it; its own coordinate was not verified in this data set." },
      coordChecked: false,
      desc: "Surveyor 3 was a robotic lander that scouted the Moon for Apollo. Apollo 12 astronauts landed close to it in November 1969, inspected it, and brought parts of it back to Earth for study.",
      why: "Surveyor programme spacecraft were one-way robotic landers with no return capability.",
      facts: ["It is one of the few spacecraft visited by humans on another world."],
      timeline: { launch: "1967-04-17", landing: "1967-04-20", legacy: "Visited by the Apollo 12 crew in November 1969." },
      sources: [S.nssdcApollo, S.lroc],
      imageQuery: "Surveyor 3 Apollo 12 Conrad Bean"
    },
    {
      id: "luna-16", name: "Luna 16 landing stage", mission: "Luna 16", planet: "moon",
      lat: -0.5137, lon: 56.3638, site: "Mare Fecunditatis region",
      agency: "Soviet space program (USSR)", type: "Lunar lander", status: "ended",
      launch: "1970-09-12", landing: "1970-09-20", end: "1970-09-21",
      accuracy: { level: "measured", note: "Soft-landing coordinate from the NASA NSSDCA table of spacecraft on the Moon." },
      coordChecked: true,
      desc: "A robotic Soviet spacecraft that drilled a soil sample and returned it to Earth in a small capsule. The landing stage stayed on the Moon.",
      why: "Only a small return capsule lifted off with the sample; the landing stage served as launch platform.",
      facts: ["NSSDCA lists the soft landing on 20 September 1970 at 0.5137 S, 56.3638 E."],
      timeline: { landing: "1970-09-20", legacy: "First robotic sample return from the Moon." },
      sources: [S.nssdcTable],
      imageQuery: "Luna 16 lunar sample return"
    },
    {
      id: "luna-17", name: "Luna 17 landing platform", mission: "Luna 17", planet: "moon",
      lat: 38.23764, lon: -35.00163, site: "Mare Imbrium (Sinus Iridum area)",
      agency: "Soviet space program (USSR)", type: "Lunar lander", status: "ended",
      launch: "1970-11-10", landing: "1970-11-17", end: null,
      accuracy: { level: "measured", note: "Soft-landing coordinate from the NASA NSSDCA table (longitude 324.99837 E = 35.00163 W)." },
      coordChecked: true,
      desc: "The landing platform of Luna 17 carried Lunokhod 1 to the surface and then served as a ramp for the rover to drive down.",
      why: "The platform was a one-way lander; its job ended when the rover rolled off.",
      facts: ["NSSDCA lists the Luna 17 soft landing on 17 November 1970."],
      timeline: { landing: "1970-11-17", legacy: "Delivered the first remote-controlled rover to another world." },
      sources: [S.nssdcTable],
      imageQuery: "Luna 17 Lunokhod 1"
    },
    {
      id: "lunokhod-1", name: "Lunokhod 1 rover", mission: "Luna 17", planet: "moon",
      lat: 38.315, lon: -35.0081, site: "Mare Imbrium (Sinus Iridum area)",
      agency: "Soviet space program (USSR)", type: "Lunar rover", status: "ended",
      launch: "1970-11-10", landing: "1970-11-17", end: "1971-09",
      accuracy: { level: "measured", note: "Rover position from the NASA NSSDCA table (longitude 324.9919 E = 35.0081 W)." },
      coordChecked: true,
      desc: "Lunokhod 1 was a remote-controlled Soviet rover driven from Earth. It worked on the Moon for months and stayed at its last position when operations ended.",
      why: "The rover was designed to operate on the Moon only, with no return capability.",
      facts: ["NSSDCA lists the rover at 38.3150 N, 35.0081 W."],
      timeline: { landing: "1970-11-17", end: "1971-09", legacy: "First remotely driven rover on another world." },
      sources: [S.nssdcTable],
      imageQuery: "Lunokhod 1 rover"
    },
    {
      id: "chandrayaan-3", name: "Chandrayaan-3 Vikram lander and Pragyan rover", mission: "Chandrayaan-3", planet: "moon",
      lat: -69.373, lon: 32.319, site: "Statio Shiv Shakti (between Manzinus C and Simpelius N craters)",
      agency: "ISRO (India)", type: "Lunar lander", status: "ended",
      launch: "2023-07-14", landing: "2023-08-23", end: null,
      accuracy: { level: "approx", note: "Published values differ (69.373 S, 32.319 E in one source; 69.3676 S, 32.3481 E in another), i.e. a few kilometres." },
      coordChecked: true,
      distanceKm: 0.1014,
      desc: "India's Vikram lander touched down near the lunar south pole on 23 August 2023 and deployed the Pragyan rover. The site was named Statio Shiv Shakti by the IAU in March 2024.",
      why: "A planned short surface mission with no return capability.",
      facts: [
        "India became the fourth country to land on the Moon and the first near the south polar region (ISRO).",
        "The Pragyan rover drove 101.4 m.",
        "Current operating status is not confirmed in this data set: check ISRO before presenting."
      ],
      timeline: { launch: "2023-07-14", landing: "2023-08-23", legacy: "Landing site named Statio Shiv Shakti (IAU, 19 March 2024)." },
      sources: [S.isro],
      imageQuery: "Chandrayaan-3 Vikram lander LRO"
    },
    {
      id: "apollo-14-sivb", name: "Apollo 14 S-IVB impact site", mission: "Apollo 14", planet: "moon",
      lat: -8.181, lon: -26.0305, site: "Lunar nearside (crater imaged by LROC)",
      agency: "NASA (USA)", type: "Spacecraft impact site", status: "impact",
      launch: "1971-01-31", landing: null, end: null,
      accuracy: { level: "measured", note: "LROC-imaged crater, longitude 333.9695 E = 26.0305 W." },
      coordChecked: true,
      desc: "The spent Saturn S-IVB stage was steered into the Moon so that the seismometers left by earlier crews could record the impact.",
      why: "Deliberate impact for lunar seismology.",
      facts: ["LROC lists the crater at 8.1810 S, 333.9695 E."],
      timeline: { launch: "1971-01-31" },
      sources: [S.lroc],
      imageQuery: "Apollo 14 S-IVB impact crater LRO"
    },
    {
      id: "apollo-17-sivb", name: "Apollo 17 S-IVB impact site", mission: "Apollo 17", planet: "moon",
      lat: -4.1681, lon: -12.3307, site: "Lunar nearside (crater imaged by LROC)",
      agency: "NASA (USA)", type: "Spacecraft impact site", status: "impact",
      launch: "1972-12-07", landing: null, end: "1972-12-10",
      accuracy: { level: "measured", note: "LROC-imaged crater, longitude 347.6693 E = 12.3307 W. NSSDCA lists the impact on 10 December 1972." },
      coordChecked: true,
      desc: "The Apollo 17 S-IVB stage hit the Moon during the mission, generating seismic signals recorded by the Apollo instruments.",
      why: "Deliberate impact for lunar seismology.",
      facts: ["LROC lists the crater at 4.1681 S, 347.6693 E."],
      timeline: { launch: "1972-12-07", end: "1972-12-10" },
      sources: [S.lroc],
      imageQuery: "Apollo 17 S-IVB impact crater LRO"
    },

    // ============================== MARS ==============================
    {
      id: "viking-1", name: "Viking 1 lander", mission: "Viking", planet: "mars",
      lat: 22.48, lon: -49.97, site: "Chryse Planitia",
      agency: "NASA (USA)", type: "Mars lander", status: "ended",
      launch: "1975-08-20", landing: "1976-07-20", end: "1982-11-11",
      accuracy: { level: "approx", note: "Published landing coordinates differ between sources by about 1-2 degrees; verify against NSSDCA / USGS before the final demo." },
      coordChecked: true,
      desc: "Viking 1 was the first successful NASA lander on Mars. It stayed where it landed and worked for years.",
      why: "A fixed lander cannot move; contact stopped in 1982.",
      facts: ["Operated 2,245 sols; last contact 11 Nov 1982 (summary table based on NSSDC)."],
      timeline: { launch: "1975-08-20", landing: "1976-07-20", end: "1982-11-11", legacy: "First NASA lander to operate on Mars." },
      sources: [S.viking, S.marsList, S.planetary],
      imageQuery: "Viking 1 lander Chryse Planitia"
    },
    {
      id: "viking-2", name: "Viking 2 lander", mission: "Viking", planet: "mars",
      lat: 47.97, lon: 134.26, site: "Utopia Planitia",
      agency: "NASA (USA)", type: "Mars lander", status: "ended",
      launch: "1975-09-09", landing: "1976-09-03", end: "1980-04-11",
      accuracy: { level: "approx", note: "Published landing coordinates differ between sources by about 1-2 degrees (the source used lists 225.74 W = 134.26 E); verify before the final demo." },
      coordChecked: true,
      desc: "Viking 2 landed in Utopia Planitia on 3 September 1976 and operated for more than three years.",
      why: "A fixed lander cannot move; contact stopped in 1980.",
      facts: ["Operated 1,281 sols; last contact 11 Apr 1980 (summary table based on NSSDC)."],
      timeline: { launch: "1975-09-09", landing: "1976-09-03", end: "1980-04-11" },
      sources: [S.viking, S.marsList, S.planetary],
      imageQuery: "Viking 2 lander Utopia Planitia"
    },
    {
      id: "pathfinder", name: "Mars Pathfinder lander and Sojourner rover", mission: "Mars Pathfinder", planet: "mars",
      lat: 19.13, lon: -33.25, site: "Ares Vallis / Chryse Planitia",
      agency: "NASA (USA)", type: "Mars lander", status: "ended",
      launch: "1996-12-04", landing: "1997-07-04", end: "1997-09",
      accuracy: { level: "approx", note: "Coordinate from general mission documentation (about 19.1 N, 326.75 E). Not yet checked against a cited table: verify before use." },
      coordChecked: false,
      desc: "Pathfinder delivered Sojourner, the first rover on Mars, to a flood plain that carried water long ago.",
      why: "The lander and rover were designed for a short mission.",
      facts: ["NASA's Mars Pathfinder delivered the first Mars rover, Sojourner."],
      timeline: { launch: "1996-12-04", landing: "1997-07-04", end: "1997-09", legacy: "Proved low-cost rover landings with airbags." },
      sources: [S.marsList, S.planetary],
      imageQuery: "Mars Pathfinder Sojourner rover"
    },
    {
      id: "spirit", name: "Spirit rover (MER-A)", mission: "Mars Exploration Rover", planet: "mars",
      lat: -14.5718, lon: 175.4785, site: "Gusev Crater",
      agency: "NASA (USA)", type: "Mars rover", status: "ended",
      launch: "2003-06-10", landing: "2004-01-04", end: "2011-05-25",
      accuracy: { level: "measured", note: "Landing site by Doppler radiometric solution: 14.571892 S, 175.47848 E (Mars ODE). The rover's final position is different from the landing site." },
      coordChecked: true,
      distanceKm: 7.73,
      desc: "Spirit explored Gusev Crater for years beyond its planned 90 sols and found evidence of past water. This marker shows the landing site, not the place where the rover stopped.",
      why: "In 2009 Spirit was stuck in soft sand; contact was last made in March 2010 and NASA ended the mission in May 2011.",
      facts: ["Marker is the LANDING site; the rover drove away from it."],
      timeline: { launch: "2003-06-10", landing: "2004-01-04", end: "2011-05-25", legacy: "Evidence of past water at Gusev Crater." },
      sources: [S.ode, S.planetary],
      imageQuery: "Spirit rover Gusev Crater"
    },
    {
      id: "opportunity", name: "Opportunity rover (MER-B)", mission: "Mars Exploration Rover", planet: "mars",
      lat: -1.9462, lon: -5.5266, site: "Meridiani Planum (Eagle Crater)",
      agency: "NASA (USA)", type: "Mars rover", status: "ended",
      launch: "2003-07-07", landing: "2004-01-25", end: "2019-02-13",
      accuracy: { level: "measured", note: "Landing site 1.9462 S, 354.4734 E (Squyres et al., JGR 2006) as listed by The Planetary Society; 354.4734 E = -5.5266 in the -180..180 convention. The rover's final position is elsewhere." },
      coordChecked: true,
      distanceKm: 45.16,
      desc: "Opportunity was designed for 90 sols and worked for nearly 15 years, finding evidence of past water on Mars. This marker shows the landing site (Eagle Crater), not the rover's final position.",
      why: "Contact was lost on 10 June 2018 during a global dust storm; NASA declared the mission complete in February 2019.",
      facts: ["Operated 5,111 sols; last contact 10 Jun 2018 (summary table).", "Marker is the LANDING site."],
      timeline: { launch: "2003-07-07", landing: "2004-01-25", end: "2019-02-13", legacy: "Strongest early evidence of ancient liquid water at Meridiani Planum." },
      sources: [S.planetary, S.marsList],
      imageQuery: "Opportunity rover Meridiani Planum"
    },
    {
      id: "phoenix", name: "Phoenix lander", mission: "Phoenix", planet: "mars",
      lat: 68.22, lon: -125.75, site: "Vastitas Borealis (Green Valley)",
      agency: "NASA (USA)", type: "Mars lander", status: "ended",
      launch: "2007-08-04", landing: "2008-05-25", end: "2008-11-02",
      accuracy: { level: "measured", note: "68.22 N, 234.25 E (Mars ODE) = 125.75 W." },
      coordChecked: true,
      desc: "Phoenix landed in the Martian arctic and dug into the soil to study water ice. It worked for 155 sols.",
      why: "Polar winter reduced the sunlight for its solar arrays; last contact 2 November 2008.",
      facts: ["Operated 155 sols; last contact 2 Nov 2008 (summary table)."],
      timeline: { launch: "2007-08-04", landing: "2008-05-25", end: "2008-11-02", legacy: "Confirmed water ice near the surface in the northern plains." },
      sources: [S.ode, S.marsList],
      imageQuery: "Phoenix Mars lander arctic"
    },
    {
      id: "curiosity", name: "Curiosity rover", mission: "Mars Science Laboratory", planet: "mars",
      lat: -4.5895, lon: 137.4417, site: "Gale Crater (Bradbury Landing)",
      agency: "NASA (USA)", type: "Mars rover", status: "active",
      launch: "2011-11-26", landing: "2012-08-05", end: null,
      accuracy: { level: "measured", note: "Landing site 4.5895 S, 137.4417 E (Vasavada et al., JGR 2014). The rover has moved since landing." },
      coordChecked: true,
      desc: "Curiosity is still operating in Gale Crater. This marker is its landing site, not its current position.",
      why: "Not abandoned: the rover is active.",
      facts: ["Listed as active (Wikipedia summary, 2026).", "Marker is the LANDING site."],
      timeline: { launch: "2011-11-26", landing: "2012-08-05", ops: "Still operating." },
      sources: [S.planetary, S.marsList],
      imageQuery: "Curiosity rover Gale Crater"
    },
    {
      id: "insight", name: "InSight lander", mission: "InSight", planet: "mars",
      lat: 4.502, lon: 135.623, site: "Elysium Planitia",
      agency: "NASA (USA)", type: "Stationary science platform", status: "ended",
      launch: "2018-05-05", landing: "2018-11-26", end: "2022-12-19",
      accuracy: { level: "measured", note: "4.502 N, 135.623 E (Golombek et al., LPSC 2019)." },
      coordChecked: true,
      desc: "InSight listened to marsquakes with a seismometer, the first dedicated geophysics station on Mars.",
      why: "Dust built up on its solar panels and power ran low; the mission ended in December 2022.",
      facts: ["The summary table lists end of mission on 19 December 2022."],
      timeline: { launch: "2018-05-05", landing: "2018-11-26", end: "2022-12-19", legacy: "First seismic data from Mars." },
      sources: [S.planetary, S.marsList],
      imageQuery: "InSight lander Mars seismometer"
    },
    {
      id: "perseverance", name: "Perseverance rover", mission: "Mars 2020", planet: "mars",
      lat: 18.4447, lon: 77.4508, site: "Jezero Crater (Octavia E. Butler Landing)",
      agency: "NASA (USA)", type: "Mars rover", status: "active",
      launch: "2020-07-30", landing: "2021-02-18", end: null,
      accuracy: { level: "approx", note: "Landing coordinate (about 18.44 N, 77.45 E) from general mission documentation. Not yet checked against a cited table: verify before use." },
      coordChecked: false,
      desc: "Perseverance is collecting rock samples in Jezero Crater. This marker is the landing site, not its current position.",
      why: "Not abandoned: the rover is active (1,811 sols as of 25 March 2026 per the Mars 2020 timeline).",
      facts: ["Launched 30 July 2020 and landed 18 February 2021 (NASA)."],
      timeline: { launch: "2020-07-30", landing: "2021-02-18", ops: "Still operating." },
      sources: [S.marsLanding, S.mars2020],
      imageQuery: "Perseverance rover Jezero Crater"
    },
    {
      id: "ingenuity", name: "Ingenuity helicopter", mission: "Mars 2020", planet: "mars",
      lat: 18.4447, lon: 77.4508, site: "Jezero Crater (final resting place nicknamed Valinor Hills)",
      agency: "NASA (USA)", type: "Helicopter", status: "ended",
      launch: "2020-07-30", landing: "2021-02-18", end: "2024-01-25",
      accuracy: { level: "area", note: "Marker shows the Jezero landing area only. The exact coordinate of the final position (Valinor Hills) was not verified in this data set." },
      coordChecked: false,
      desc: "Ingenuity was a technology demonstration that flew 72 times and became the first aircraft on another planet.",
      why: "Rotor blades were damaged on flight 72 (18 January 2024); NASA ended the mission on 25 January 2024.",
      facts: [
        "First flight 19 April 2021; 72 flights in total (NASA/JPL).",
        "Planned for up to five flights over 30 days."
      ],
      timeline: { launch: "2020-07-30", landing: "2021-02-18", ops: "First flight 19 April 2021.", end: "2024-01-25", legacy: "Proved powered, controlled flight on Mars." },
      sources: [S.ingenuity],
      imageQuery: "Ingenuity helicopter Mars"
    }
  ];

  window.SOURCES = S;
  window.OBJECTS = OBJECTS;
  window.STATUS = {
    left: { label: "Left behind on purpose", color: "#f2c14e" },
    active: { label: "Still operating", color: "#5fd39b" },
    ended: { label: "Mission ended", color: "#8fa6d1" },
    impact: { label: "Impact site", color: "#e5584f" }
  };
})();
