const figure = document.querySelector(".observatory");
const canvas = figure.querySelector("canvas");
const context = canvas.getContext("2d");
const layer = figure.querySelector(".layer-toggle");
const labels = figure.querySelector(".model-labels");
const motion = figure.querySelector(".motion");
const preference = matchMedia("(prefers-reduced-motion: reduce)");
let paused = preference.matches;
let inView = true;
let network = layer.getAttribute("aria-pressed") === "true";
let frame = 0;
let elapsed = 0;
let previous = 0;
let width = 0;
let height = 0;

// Curved connections between illustrated pavilions. Coordinates are local to the artwork.
const routes = [
  [[.24, .66], [.30, .16], [.52, .35]],
  [[.52, .35], [.64, .06], [.83, .45]],
  [[.83, .45], [.60, .48], [.24, .66]]
];
function pointOnRoute(route, t) {
  const [a, b, c] = route;
  const u = 1 - t;
  return [
    (u * u * a[0] + 2 * u * t * b[0] + t * t * c[0]) * width,
    (u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]) * height
  ];
}

function paint(time) {
  if (!context) return;
  context.clearRect(0, 0, width, height);
  routes.forEach((route, index) => {
    const start = pointOnRoute(route, 0);
    context.lineWidth = network ? 1.4 : .8;
    context.strokeStyle = network ? "#efdaccbb" : "#ffcba164";
    context.setLineDash(network ? [] : [2, 4]);
    context.beginPath();
    context.moveTo(...start);
    context.quadraticCurveTo(route[1][0] * width, route[1][1] * height, route[2][0] * width, route[2][1] * height);
    context.stroke();
    context.setLineDash([]);

    const [x, y] = pointOnRoute(route, (time / 7400 + .17 + index * .31) % 1);
    const glow = context.createRadialGradient(x, y, 0, x, y, 8);
    glow.addColorStop(0, "#ffe4bc");
    glow.addColorStop(.23, "#ffce9ed9");
    glow.addColorStop(1, "#eda3a000");
    context.fillStyle = glow;
    context.fillRect(x - 8, y - 8, 16, 16);
    context.beginPath();
    context.arc(...start, network ? 5 : 3.5, 0, Math.PI * 2);
    context.strokeStyle = "#ffcca9";
    context.stroke();
  });
}

function animate(timestamp) {
  frame = 0;
  if (previous) elapsed += Math.min(100, timestamp - previous);
  previous = timestamp;
  paint(elapsed);
  frame = requestAnimationFrame(animate);
}

function syncAnimation() {
  cancelAnimationFrame(frame);
  previous = 0;
  paint(elapsed);
  if (context && !paused && inView && !document.hidden) frame = requestAnimationFrame(animate);
  motion.setAttribute("aria-label", paused ? "Bewegung starten" : "Bewegung pausieren");
  motion.setAttribute("aria-pressed", String(paused));
  motion.querySelector("span").textContent = paused ? "▷" : "Ⅱ";
}

new ResizeObserver(() => {
  const bounds = canvas.getBoundingClientRect();
  width = bounds.width;
  height = bounds.height;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context?.setTransform(ratio, 0, 0, ratio, 0, 0);
  paint(elapsed);
}).observe(canvas);
new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  syncAnimation();
}).observe(figure);
document.addEventListener("visibilitychange", syncAnimation);
preference.addEventListener("change", () => {
  paused = preference.matches;
  syncAnimation();
});
motion.addEventListener("click", () => {
  paused = !paused;
  syncAnimation();
});
layer.addEventListener("click", () => {
  network = !network;
  labels.hidden = !network;
  layer.setAttribute("aria-pressed", String(network));
  paint(elapsed);
});
layer.hidden = false;
motion.hidden = !context;
syncAnimation();
