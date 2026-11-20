(() => {
  const map = document.querySelector(".map");
  if (!map) return;

  const pins = Array.from(map.querySelectorAll(".pin[data-station]"));
  const entries = Array.from(document.querySelectorAll(".registry .entry"));
  const description = map.querySelector(".map-description");
  const readEntry = map.querySelector(".read-entry");
  const tourButton = map.querySelector(".tour");
  const tourLabel = tourButton.querySelector(".tour-label");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const stations = {
    austausch: { caption: "A · Erfahrungen mit KI teilen", position: 63 },
    werkstatt: { caption: "B · Eigene Projekte ausprobieren", position: 99.8 },
    lektuere: { caption: "C · Im Newsletter blättern", position: 0.1 }
  };

  // The route follows the courtyard paths in the base illustration. Its
  // normalized length lets the two rings travel together at any display size.
  const route = "M207.3 219.9 213.4 226.8 240.7 237.1 Q249 239 253.8 236.6 L335.6 195.9 348.7 182.7 358.8 184.7 415.4 212.1 Q425 217 429.5 214.1 L484.1 187.6 512.4 171.9 528.5 172.9 553.8 186.1";
  function svgElement(tag, attributes) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
    return node;
  }

  const overlay = svgElement("svg", {
    class: "atlas-route", viewBox: "0 0 780 475", "aria-hidden": "true", focusable: "false"
  });
  const line = svgElement("path", { id: "atlas-walk", d: route, pathLength: "100" });
  const traveller = svgElement("g", { class: "traveller", "stroke-dasharray": "0.03 106" });
  traveller.append(
    svgElement("use", { href: "#atlas-walk", class: "traveller-halo" }),
    svgElement("use", { href: "#atlas-walk", class: "traveller-dot" })
  );
  // Styling is applied to each instance so the visible line and the marker
  // share a single path definition.
  const defs = svgElement("defs", {});
  defs.append(line);
  overlay.append(defs, svgElement("use", { href: "#atlas-walk", class: "walk-line" }), traveller);
  map.querySelector(".neighbourhood").after(overlay);

  const controls = document.createElement("div");
  controls.className = "tour-controls";
  tourButton.before(controls);
  const endButton = document.createElement("button");
  endButton.type = "button";
  endButton.className = "tour-end";
  endButton.textContent = "Beenden";
  endButton.setAttribute("aria-label", "Rundgang beenden");
  endButton.hidden = true;
  controls.append(tourButton, endButton);
  tourButton.hidden = false;

  let visible = false;
  let firstVisit = true;
  let selectedStation = null;
  let journey = null;
  let tourState = "idle";
  let timer;
  let tourIndex = 0;
  const dwellTime = 4300;

  function moveMarker(position, animate) {
    const from = Number.parseFloat(getComputedStyle(traveller).strokeDashoffset) || 0;
    journey?.cancel();
    journey = null;
    const markerOffset = -position;
    traveller.setAttribute("stroke-dashoffset", String(markerOffset));
    if (animate && visible && !document.hidden && !reducedMotion.matches && traveller.animate) {
      journey = traveller.animate(
        [{ strokeDashoffset: from + "px" }, { strokeDashoffset: markerOffset + "px" }],
        { duration: 1500, easing: "cubic-bezier(.42,0,.27,1)" }
      );
    }
  }

  function markStation(id) {
    if (id === selectedStation) return;
    selectedStation = id;
    const station = stations[id];
    map.classList.toggle("with-station", Boolean(station));
    description.textContent = station?.caption ?? "Station auf der Karte wählen";
    readEntry.hidden = !station;
    if (station) {
      readEntry.hash = id;
      moveMarker(station.position, !firstVisit);
    }
    for (const pin of pins) {
      const active = pin.dataset.station === id;
      pin.classList.toggle("active", active);
      if (active) pin.setAttribute("aria-current", "true");
      else pin.removeAttribute("aria-current");
    }
  }

  function selectEntry(id) {
    if (!Object.hasOwn(stations, id)) return;
    for (const entry of entries) entry.open = entry.id === id;
    markStation(id);
  }

  function setTourState(state) {
    tourState = state;
    window.clearTimeout(timer);
    endButton.hidden = state === "idle";
    map.classList.toggle("tour-running", state === "playing");
    const control = {
      idle: ["▶", "Rundgang starten"],
      playing: ["Ⅱ", "Rundgang pausieren"],
      paused: ["▶", "Fortsetzen"]
    }[state];
    tourButton.firstElementChild.textContent = control[0];
    tourLabel.textContent = control[1];
  }

  function stopTour() {
    setTourState("idle");
    journey?.cancel();
    journey = null;
  }

  function scheduleNextStation() {
    timer = window.setTimeout(() => {
      tourIndex++;
      if (tourIndex === pins.length) {
        stopTour();
        return;
      }
      selectEntry(pins[tourIndex].dataset.station);
      scheduleNextStation();
    }, dwellTime);
  }

  tourButton.addEventListener("click", () => {
    if (tourState === "playing") {
      setTourState("paused");
      if (journey?.playState === "running") journey.pause();
      return;
    }
    if (tourState === "paused") {
      if (journey?.playState === "paused") journey.play();
    } else {
      tourIndex = 0;
      selectEntry(pins[tourIndex].dataset.station);
    }
    setTourState("playing");
    scheduleNextStation();
  });

  endButton.addEventListener("click", () => {
    stopTour();
    tourButton.focus();
  });

  for (const pin of pins) {
    pin.addEventListener("click", (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      stopTour();
      selectEntry(pin.dataset.station);
    });
  }
  for (const entry of entries) {
    entry.querySelector("summary").addEventListener("click", stopTour);
    entry.addEventListener("toggle", () => {
      if (entry.open) selectEntry(entry.id);
      else if (!entries.some((item) => item.open)) markStation(null);
    });
  }

  readEntry.addEventListener("click", stopTour);
  window.addEventListener("hashchange", () => {
    stopTour();
    selectEntry(location.hash.slice(1));
  });

  const initialId = location.hash.slice(1);
  selectEntry(Object.hasOwn(stations, initialId) ? initialId : pins[0].dataset.station);

  function updateVisibility(inView) {
    visible = inView;
    if (!visible || document.hidden) {
      stopTour();
      return;
    }
    if (firstVisit && selectedStation) {
      firstVisit = false;
      traveller.setAttribute("stroke-dashoffset", "0");
      moveMarker(stations[selectedStation].position, true);
    }
  }

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(([entry]) => updateVisibility(entry.isIntersecting)).observe(map);
  } else {
    updateVisibility(true);
  }
  document.addEventListener("visibilitychange", () => updateVisibility(visible));
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      journey?.cancel();
      journey = null;
    }
  });
})();
