import { effectDocs } from "./effects.js";

const collection = document.querySelector("#collection");
const search = document.querySelector("#search");
const count = document.querySelector("#count");
const empty = document.querySelector("#empty");
const filters = [...document.querySelectorAll("[data-filter]")];
let activeFilter = "all";

effectDocs.forEach((effect, index) => {
  const link = document.createElement("a");
  link.className = "effect-card";
  link.href = `./effects/${effect.id}.html`;
  link.dataset.kind = effect.kind;
  link.dataset.search = `${effect.name} ${effect.id} ${effect.group} ${effect.summary}`.toLowerCase();
  link.innerHTML = `
    <div class="card-top"><span class="index">${String(index + 1).padStart(2, "0")}</span><span class="pill">${effect.kind}</span></div>
    <h2>${effect.name}</h2>
    <p class="card-summary">${effect.summary}</p>
    <span class="card-meta mono">${effect.group} · Open page ↗</span>`;
  collection.append(link);
});

const update = () => {
  const query = search.value.trim().toLowerCase();
  let visible = 0;
  collection.querySelectorAll(".effect-card").forEach((card) => {
    const matchesKind = activeFilter === "all" || card.dataset.kind === activeFilter;
    const matchesQuery = !query || card.dataset.search.includes(query);
    const show = matchesKind && matchesQuery;
    card.hidden = !show;
    if (show) visible += 1;
  });
  count.textContent = `${visible} / ${effectDocs.length}`;
  empty.style.display = visible ? "none" : "block";
};

filters.forEach((filter) => filter.addEventListener("click", () => {
  activeFilter = filter.dataset.filter;
  filters.forEach((item) => item.classList.toggle("active", item === filter));
  update();
}));
search.addEventListener("input", update);
update();
