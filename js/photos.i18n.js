/* Photo Archive: interface texts (English). Merged into the main dictionary; load after i18n.js. */
(function () {
  "use strict";
  var D = window.I18N && window.I18N.dict; if (!D) return;
  var X = {
    en: {
      "nav.photos": "Photo Archive",
      "pa.title": "Photo Archive", "pa.lede": "Photographs of Moon and Mars exploration, retrieved live from NASA open archives. Nothing is stored in the project database: the page keeps only a short-lived browser cache of titles and links.",
      "pa.note": "Images are found by mission-specific searches and filtered so that the mission name appears in the record. The date is the date_created field of the NASA record (usually the capture date, but it can be the publication date).",
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
  };
  ["en"].forEach(function (l) { if (D[l]) Object.keys(X[l]).forEach(function (k) { D[l][k] = X[l][k]; }); });
})();
