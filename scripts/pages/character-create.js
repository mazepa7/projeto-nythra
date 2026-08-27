const classSelect = document.querySelector("#class");
const nexSelect = document.querySelector("#nex");
const vigorInput = document.querySelector("#vig");
const pvTotal = document.querySelector("#pv-total");
const pvDescription = document.querySelector("#pv-description");

const classRules = {
  Combatente: { initialPV: 20, pvPerNex: 4 },
  Especialista: { initialPV: 16, pvPerNex: 3 },
  Ocultista: { initialPV: 12, pvPerNex: 2 },
};

function getNexAdvancements(nex) {
  // O NEX 5% é o ponto inicial. NEX 99% representa o último avanço.
  if (nex === 99) return 19;

  return Math.max(0, Math.floor(nex / 5) - 1);
}

function updatePV() {
  const selectedClass = classSelect.value;
  const rules = classRules[selectedClass];

  if (!rules) {
    pvTotal.textContent = "—";
    pvDescription.textContent =
      "Selecione uma classe para calcular os seus PV máximos.";
    return;
  }

  const nex = Number(nexSelect.value);
  const vigor = Math.max(0, Number(vigorInput.value) || 0);
  const advancements = getNexAdvancements(nex);

  const totalPV =
    rules.initialPV +
    vigor +
    advancements * (rules.pvPerNex + vigor);

  pvTotal.textContent = totalPV;

  pvDescription.textContent =
    `${rules.initialPV} + ${vigor} de Vigor` +
    (advancements
      ? ` + ${advancements} avanço${advancements > 1 ? "s" : ""} de NEX.`
      : ".");
}

[classSelect, nexSelect, vigorInput].forEach((field) => {
  field.addEventListener("input", updatePV);
  field.addEventListener("change", updatePV);
});

updatePV();