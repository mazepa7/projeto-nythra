const storageKey = "nythra-op-character-sheet";

const classRules = {
  Combatente: { pv: [20, 4], pe: [2, 2], san: [12, 3] },
  Especialista: { pv: [16, 3], pe: [3, 3], san: [16, 4] },
  Ocultista: { pv: [12, 2], pe: [4, 4], san: [20, 5] },
};

const fields = document.querySelectorAll("input, select, textarea");
const get = (id) => document.querySelector(`#${id}`);

function getAdvancements(nex) {
  return nex === 99 ? 19 : Math.max(0, Math.floor(nex / 5) - 1);
}

function numberValue(id) {
  return Math.max(0, Number(get(id).value) || 0);
}

function calculatedStats() {
  const rules = classRules[get("character-class").value];
  const advances = getAdvancements(Number(get("nex").value));
  const vigor = numberValue("vig");
  const presence = numberValue("pre");

  return {
    pv: rules.pv[0] + vigor + advances * (rules.pv[1] + vigor),
    pe: rules.pe[0] + presence + advances * (rules.pe[1] + presence),
    san: rules.san[0] + advances * rules.san[1],
    advances,
    vigor,
    presence,
    rules,
  };
}

function updateResource(resource, maximum) {
  const current = get(`current-${resource}`);
  const output = get(`max-${resource}`);
  const bar = get(`${resource}-bar`);
  const safeCurrent = Math.min(maximum, Math.max(0, Number(current.value) || 0));

  current.max = maximum;
  current.value = safeCurrent;
  output.value = maximum;
  bar.style.width = `${maximum ? (safeCurrent / maximum) * 100 : 0}%`;
}

function updateCalculatedFields() {
  const stats = calculatedStats();
  updateResource("pv", stats.pv);
  updateResource("pe", stats.pe);
  updateResource("san", stats.san);

  const suffix = stats.advances ? ` + ${stats.advances} avanço${stats.advances > 1 ? "s" : ""}` : "";
  get("pv-formula").textContent = `${stats.rules.pv[0]} + ${stats.vigor} de Vigor${suffix}`;
  get("pe-formula").textContent = `${stats.rules.pe[0]} + ${stats.presence} de Presença${suffix}`;
  get("san-formula").textContent = `${stats.rules.san[0]} inicial${suffix ? `${suffix} de NEX` : ""}`;
}

function saveSheet() {
  const data = {};
  fields.forEach((field) => {
    const key = field.id || field.dataset.skill;
    if (key) data[key] = field.value;
  });

  localStorage.setItem(storageKey, JSON.stringify(data));
  get("save-status").textContent = "Alterações salvas localmente";
}

function loadSheet() {
  const saved = localStorage.getItem(storageKey);
  if (!saved) return;

  const data = JSON.parse(saved);
  fields.forEach((field) => {
    const key = field.id || field.dataset.skill;
    if (key && data[key] !== undefined) field.value = data[key];
  });
}

fields.forEach((field) => {
  field.addEventListener("input", () => {
    updateCalculatedFields();
    get("save-status").textContent = "Salvando...";
    saveSheet();
  });

  field.addEventListener("change", () => {
    updateCalculatedFields();
    saveSheet();
  });
});

loadSheet();
updateCalculatedFields();
