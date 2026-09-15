const storageKey = "nythra_campaigns";

const params = new URLSearchParams(
  window.location.search
);

const campaignId = params.get("id");

/* ========================================
   CAMPANHA
======================================== */

const campaignName =
  document.querySelector("#campaign-name");

const campaignDescription =
  document.querySelector("#campaign-description");

/* ========================================
   ANOTAÇÕES
======================================== */

const quickNotes =
  document.querySelector("#quick-notes");

const notesStatus =
  document.querySelector("#notes-status");

const notesCount =
  document.querySelector("#notes-count");

/* ========================================
   JOGADORES
======================================== */

const playersCount =
  document.querySelector("#players-count");

const playersEmptyState =
  document.querySelector("#players-empty-state");

const playersGrid =
  document.querySelector("#players-grid");

const linkPlayerButton =
  document.querySelector("#link-player-button");

const emptyLinkPlayerButton =
  document.querySelector("#empty-link-player-button");

const linkPlayerModal =
  document.querySelector("#link-player-modal");

const closePlayerModalButton =
  document.querySelector("#close-player-modal");

const cancelPlayerLinkButton =
  document.querySelector("#cancel-player-link");

const linkPlayerForm =
  document.querySelector("#link-player-form");

const playerNameInput =
  document.querySelector("#player-name");

const characterNameInput =
  document.querySelector("#character-name");

const characterOriginInput =
  document.querySelector("#character-origin");

const characterClassInput =
  document.querySelector("#character-class");

const characterNexInput =
  document.querySelector("#character-nex");

/* ========================================
   COMBATE
======================================== */

const combatCount =
  document.querySelector("#combat-count");

const combatEmptyState =
  document.querySelector("#combat-empty-state");

const activeCombat =
  document.querySelector("#active-combat");

const activeCombatName =
  document.querySelector("#active-combat-name");

const combatRoundNumber =
  document.querySelector("#combat-round-number");

const currentTurnLabel =
  document.querySelector("#current-turn-label");

const initiativeList =
  document.querySelector("#initiative-list");

const initiativeEmpty =
  document.querySelector("#initiative-empty");

const createCombatButton =
  document.querySelector("#create-combat-button");

const emptyCreateCombatButton =
  document.querySelector(
    "#empty-create-combat-button"
  );

const addParticipantButton =
  document.querySelector("#add-participant-button");

const previousTurnButton =
  document.querySelector("#previous-turn-button");

const nextTurnButton =
  document.querySelector("#next-turn-button");

const finishCombatButton =
  document.querySelector("#finish-combat-button");

/* MODAL DE COMBATE */

const createCombatModal =
  document.querySelector("#create-combat-modal");

const closeCombatModalButton =
  document.querySelector("#close-combat-modal");

const cancelCombatButton =
  document.querySelector("#cancel-combat-button");

const createCombatForm =
  document.querySelector("#create-combat-form");

const combatNameInput =
  document.querySelector("#combat-name");

/* MODAL DE PARTICIPANTE */

const participantModal =
  document.querySelector("#participant-modal");

const closeParticipantModalButton =
  document.querySelector(
    "#close-participant-modal"
  );

const cancelParticipantButton =
  document.querySelector(
    "#cancel-participant-button"
  );

const participantForm =
  document.querySelector("#participant-form");

const participantTypeInput =
  document.querySelector("#participant-type");

const participantInitiativeInput =
  document.querySelector(
    "#participant-initiative"
  );

const participantNameInput =
  document.querySelector("#participant-name");

const participantHealthInput =
  document.querySelector("#participant-health");

const participantMaxHealthInput =
  document.querySelector(
    "#participant-max-health"
  );

/* ========================================
   ESTADO
======================================== */

let saveTimer = null;

let campaigns = loadCampaigns();

let campaign = campaigns.find((item) => {
  return String(item.id) === String(campaignId);
});

/* ========================================
   ARMAZENAMENTO
======================================== */

function loadCampaigns() {
  const savedCampaigns =
    localStorage.getItem(storageKey);

  if (!savedCampaigns) {
    return [];
  }

  try {
    const parsedCampaigns =
      JSON.parse(savedCampaigns);

    return Array.isArray(parsedCampaigns)
      ? parsedCampaigns
      : [];
  } catch {
    return [];
  }
}

function saveCampaigns() {
  localStorage.setItem(
    storageKey,
    JSON.stringify(campaigns)
  );
}

function updateCurrentCampaign() {
  if (!campaign) {
    return;
  }

  campaigns = campaigns.map((item) => {
    return String(item.id) === String(campaign.id)
      ? campaign
      : item;
  });

  saveCampaigns();
}

/* ========================================
   FUNÇÕES AUXILIARES
======================================== */

function createElement(
  elementName,
  className,
  textContent
) {
  const element =
    document.createElement(elementName);

  if (className) {
    element.className = className;
  }

  if (textContent !== undefined) {
    element.textContent = textContent;
  }

  return element;
}

function createUniqueId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function getInitials(name) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "?";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`
    .toUpperCase();
}

function formatResourceValue(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "—";
  }

  return String(value);
}

function lockPageScroll() {
  document.body.style.overflow = "hidden";
}

function unlockPageScroll() {
  const hasOpenModal =
    !linkPlayerModal.hidden ||
    !createCombatModal.hidden ||
    !participantModal.hidden;

  if (!hasOpenModal) {
    document.body.style.overflow = "";
  }
}

/* ========================================
   ANOTAÇÕES
======================================== */

function updateNotesCount() {
  const hasNotes =
    quickNotes.value.trim().length > 0;

  notesCount.textContent = hasNotes
    ? "1"
    : "0";
}

function saveQuickNotes() {
  if (!campaign) {
    return;
  }

  campaign.quickNotes = quickNotes.value;

  updateCurrentCampaign();

  notesStatus.textContent = "Salvo";

  updateNotesCount();
}

function scheduleNotesSave() {
  notesStatus.textContent = "Salvando...";

  clearTimeout(saveTimer);

  saveTimer = setTimeout(
    saveQuickNotes,
    600
  );
}

/* ========================================
   MODAL DE JOGADOR
======================================== */

function openPlayerModal() {
  linkPlayerModal.hidden = false;

  lockPageScroll();

  window.requestAnimationFrame(() => {
    playerNameInput.focus();
  });
}

function closePlayerModal() {
  linkPlayerModal.hidden = true;
  linkPlayerForm.reset();

  unlockPageScroll();
}

/* ========================================
   JOGADORES
======================================== */

function createResourceElement(
  label,
  value,
  resourceClass
) {
  const resource = createElement(
    "div",
    `player-resource ${resourceClass}`
  );

  const resourceLabel = createElement(
    "span",
    "",
    label
  );

  const resourceValue = createElement(
    "strong",
    "",
    formatResourceValue(value)
  );

  resource.append(
    resourceLabel,
    resourceValue
  );

  return resource;
}

function createPlayerCard(player) {
  const card = createElement(
    "article",
    "player-card"
  );

  card.dataset.playerId = player.id;

  const cardHeader = createElement(
    "header",
    "player-card-header"
  );

  const identity = createElement(
    "div",
    "player-identity"
  );

  const avatar = createElement(
    "div",
    "player-avatar",
    getInitials(player.characterName)
  );

  avatar.setAttribute("aria-hidden", "true");

  const nameGroup = createElement(
    "div",
    "player-name-group"
  );

  const characterName = createElement(
    "h3",
    "",
    player.characterName
  );

  const playerName = createElement(
    "p",
    "",
    `Jogador: ${player.playerName}`
  );

  nameGroup.append(
    characterName,
    playerName
  );

  identity.append(
    avatar,
    nameGroup
  );

  const nex = createElement(
    "span",
    "player-nex",
    `NEX ${player.characterNex}`
  );

  cardHeader.append(identity, nex);

  const details = createElement(
    "div",
    "player-details"
  );

  details.append(
    createElement(
      "span",
      "player-detail",
      player.characterClass
    ),
    createElement(
      "span",
      "player-detail",
      player.characterOrigin ||
        "Origem não informada"
    )
  );

  const resources = createElement(
    "div",
    "player-resources"
  );

  resources.append(
    createResourceElement(
      "PV",
      player.health,
      "health"
    ),
    createResourceElement(
      "SAN",
      player.sanity,
      "sanity"
    ),
    createResourceElement(
      "PE",
      player.effort,
      "effort"
    )
  );

  const actions = createElement(
    "footer",
    "player-card-actions"
  );

  const notice = createElement(
    "span",
    "player-resource-notice",
    "Recursos disponíveis ao vincular a ficha"
  );

  const removeButton = createElement(
    "button",
    "remove-player-button",
    "Remover"
  );

  removeButton.type = "button";

  removeButton.addEventListener("click", () => {
    removePlayer(player.id);
  });

  actions.append(notice, removeButton);

  card.append(
    cardHeader,
    details,
    resources,
    actions
  );

  return card;
}

function renderPlayers() {
  if (!campaign) {
    return;
  }

  if (!Array.isArray(campaign.players)) {
    campaign.players = [];
  }

  playersGrid.replaceChildren();

  playersCount.textContent =
    campaign.players.length;

  const hasPlayers =
    campaign.players.length > 0;

  playersEmptyState.hidden = hasPlayers;
  playersGrid.hidden = !hasPlayers;

  campaign.players.forEach((player) => {
    playersGrid.appendChild(
      createPlayerCard(player)
    );
  });
}

function handlePlayerSubmit(event) {
  event.preventDefault();

  if (!campaign) {
    return;
  }

  const playerName =
    playerNameInput.value.trim();

  const characterName =
    characterNameInput.value.trim();

  const characterOrigin =
    characterOriginInput.value.trim();

  const characterClass =
    characterClassInput.value;

  const characterNex =
    characterNexInput.value;

  if (
    !playerName ||
    !characterName ||
    !characterClass ||
    !characterNex
  ) {
    return;
  }

  const newPlayer = {
    id: createUniqueId(),
    playerName,
    characterName,
    characterOrigin,
    characterClass,
    characterNex,
    health: null,
    sanity: null,
    effort: null,
    createdAt: new Date().toISOString()
  };

  campaign.players.push(newPlayer);

  updateCurrentCampaign();
  renderPlayers();
  closePlayerModal();
}

function removePlayer(playerId) {
  const player = campaign.players.find(
    (item) => item.id === playerId
  );

  if (!player) {
    return;
  }

  const shouldRemove = window.confirm(
    `Remover ${player.characterName} desta campanha?`
  );

  if (!shouldRemove) {
    return;
  }

  campaign.players = campaign.players.filter(
    (item) => item.id !== playerId
  );

  updateCurrentCampaign();
  renderPlayers();
}

/* ========================================
   MODAIS DO COMBATE
======================================== */

function openCombatModal() {
  if (campaign.activeCombat) {
    return;
  }

  createCombatModal.hidden = false;

  lockPageScroll();

  window.requestAnimationFrame(() => {
    combatNameInput.focus();
  });
}

function closeCombatModal() {
  createCombatModal.hidden = true;
  createCombatForm.reset();

  unlockPageScroll();
}

function openParticipantModal() {
  if (!campaign.activeCombat) {
    return;
  }

  participantModal.hidden = false;

  lockPageScroll();

  window.requestAnimationFrame(() => {
    participantNameInput.focus();
  });
}

function closeParticipantModal() {
  participantModal.hidden = true;
  participantForm.reset();

  unlockPageScroll();
}

/* ========================================
   COMBATE
======================================== */

function getParticipantTypeLabel(type) {
  const labels = {
    player: "Jogador",
    ally: "Aliado",
    enemy: "Inimigo"
  };

  return labels[type] || "Participante";
}

function sortParticipants(participants) {
  return participants.sort((first, second) => {
    return (
      Number(second.initiative) -
      Number(first.initiative)
    );
  });
}

function calculateHealthPercentage(
  health,
  maxHealth
) {
  if (maxHealth <= 0) {
    return 0;
  }

  const percentage =
    (health / maxHealth) * 100;

  return Math.max(
    0,
    Math.min(100, percentage)
  );
}

function createHealthControl(participant) {
  const control = createElement(
    "div",
    "participant-health-control"
  );

  const healthContainer = createElement(
    "div",
    "health-container"
  );

  const healthDisplay = createElement(
    "div",
    "health-display",
    `${participant.health}/${participant.maxHealth}`
  );

  const healthBar = createElement(
    "div",
    "health-bar"
  );

  const healthBarFill = createElement(
    "div",
    "health-bar-fill"
  );

  const healthPercentage =
    calculateHealthPercentage(
      participant.health,
      participant.maxHealth
    );

  healthBarFill.style.width =
    `${healthPercentage}%`;

  healthBar.appendChild(healthBarFill);

  healthContainer.append(
    healthDisplay,
    healthBar
  );

  const adjustment = createElement(
    "div",
    "health-adjustment"
  );

  const decreaseButton = createElement(
    "button",
    "health-change-button damage-button",
    "−"
  );

  decreaseButton.type = "button";
  decreaseButton.title = "Aplicar dano";

  decreaseButton.setAttribute(
    "aria-label",
    `Aplicar dano em ${participant.name}`
  );

  const amountInput = createElement(
    "input",
    "health-amount-input"
  );

  amountInput.type = "number";
  amountInput.min = "1";
  amountInput.max = "9999";
  amountInput.value = "1";

  amountInput.setAttribute(
    "aria-label",
    `Valor de dano ou cura para ${participant.name}`
  );

  const increaseButton = createElement(
    "button",
    "health-change-button heal-button",
    "+"
  );

  increaseButton.type = "button";
  increaseButton.title = "Aplicar cura";

  increaseButton.setAttribute(
    "aria-label",
    `Aplicar cura em ${participant.name}`
  );

  decreaseButton.addEventListener(
    "click",
    () => {
      const amount = Number(
        amountInput.value
      );

      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.focus();
        return;
      }

      changeParticipantHealth(
        participant.id,
        -amount
      );
    }
  );

  increaseButton.addEventListener(
    "click",
    () => {
      const amount = Number(
        amountInput.value
      );

      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput.focus();
        return;
      }

      changeParticipantHealth(
        participant.id,
        amount
      );
    }
  );

  adjustment.append(
    decreaseButton,
    amountInput,
    increaseButton
  );

  control.append(
    healthContainer,
    adjustment
  );

  return control;
}

function createInitiativeItem(
  participant,
  index,
  currentTurnIndex
) {
  const isCurrentTurn =
    index === currentTurnIndex;

  const item = createElement(
    "article",
    isCurrentTurn
      ? "initiative-item current-turn"
      : "initiative-item"
  );

  const position = createElement(
    "span",
    "initiative-position",
    String(index + 1)
  );

  const participantContainer =
    createElement(
      "div",
      "combat-participant"
    );

  const participantIcon = createElement(
    "div",
    `participant-icon ${participant.type}`,
    getInitials(participant.name)
  );

  participantIcon.setAttribute(
    "aria-hidden",
    "true"
  );

  const participantInfo = createElement(
    "div",
    "participant-info"
  );

  const participantName = createElement(
    "strong",
    "",
    participant.name
  );

  const participantType = createElement(
    "span",
    "participant-type",
    getParticipantTypeLabel(
      participant.type
    )
  );

  participantInfo.append(
    participantName,
    participantType
  );

  participantContainer.append(
    participantIcon,
    participantInfo
  );

  const initiative = createElement(
    "span",
    "initiative-value",
    String(participant.initiative)
  );

  const healthControl =
    createHealthControl(participant);

  const actions = createElement(
    "div",
    "participant-actions"
  );

  const removeButton = createElement(
    "button",
    "remove-participant-button",
    "×"
  );

  removeButton.type = "button";

  removeButton.setAttribute(
    "aria-label",
    `Remover ${participant.name} do combate`
  );

  removeButton.addEventListener(
    "click",
    () => {
      removeParticipant(participant.id);
    }
  );

  actions.appendChild(removeButton);

  item.append(
    position,
    participantContainer,
    initiative,
    healthControl,
    actions
  );

  return item;
}

function renderCombat() {
  if (!campaign) {
    return;
  }

  const combat = campaign.activeCombat;
  const hasCombat = Boolean(combat);

  combatCount.textContent =
    hasCombat ? "1" : "0";

  combatEmptyState.hidden = hasCombat;
  activeCombat.hidden = !hasCombat;
  createCombatButton.hidden = hasCombat;

  if (!combat) {
    return;
  }

  if (!Array.isArray(combat.participants)) {
    combat.participants = [];
  }

  if (!Number.isInteger(combat.currentTurnIndex)) {
    combat.currentTurnIndex = 0;
  }

  if (!Number.isInteger(combat.round)) {
    combat.round = 1;
  }

  if (
    combat.currentTurnIndex >=
    combat.participants.length
  ) {
    combat.currentTurnIndex = 0;
  }

  activeCombatName.textContent =
    combat.name;

  combatRoundNumber.textContent =
    combat.round;

  initiativeList.replaceChildren();

  const hasParticipants =
    combat.participants.length > 0;

  initiativeEmpty.hidden =
    hasParticipants;

  previousTurnButton.disabled =
    !hasParticipants;

  nextTurnButton.disabled =
    !hasParticipants;

  if (!hasParticipants) {
    currentTurnLabel.textContent =
      "Aguardando participantes";

    return;
  }

  const currentParticipant =
    combat.participants[
      combat.currentTurnIndex
    ];

  currentTurnLabel.textContent =
    `Turno de ${currentParticipant.name}`;

  combat.participants.forEach(
    (participant, index) => {
      const item = createInitiativeItem(
        participant,
        index,
        combat.currentTurnIndex
      );

      initiativeList.appendChild(item);
    }
  );
}

function handleCreateCombat(event) {
  event.preventDefault();

  const combatName =
    combatNameInput.value.trim();

  if (!combatName) {
    return;
  }

  campaign.activeCombat = {
    id: createUniqueId(),
    name: combatName,
    round: 1,
    currentTurnIndex: 0,
    participants: [],
    createdAt: new Date().toISOString()
  };

  updateCurrentCampaign();
  renderCombat();
  closeCombatModal();
}

function handleParticipantSubmit(event) {
  event.preventDefault();

  const combat = campaign.activeCombat;

  if (!combat) {
    return;
  }

  const type =
    participantTypeInput.value;

  const name =
    participantNameInput.value.trim();

  const initiative = Number(
    participantInitiativeInput.value
  );

  const health = Number(
    participantHealthInput.value
  );

  const maxHealth = Number(
    participantMaxHealthInput.value
  );

  if (
    !name ||
    !Number.isFinite(initiative) ||
    !Number.isFinite(health) ||
    !Number.isFinite(maxHealth)
  ) {
    return;
  }

  if (health > maxHealth) {
    window.alert(
      "A vida atual não pode ser maior que a vida máxima."
    );

    participantHealthInput.focus();

    return;
  }

  const currentParticipant =
    combat.participants[
      combat.currentTurnIndex
    ];

  const newParticipant = {
    id: createUniqueId(),
    type,
    name,
    initiative,
    health,
    maxHealth,
    createdAt: new Date().toISOString()
  };

  combat.participants.push(newParticipant);

  sortParticipants(combat.participants);

  if (currentParticipant) {
    const newCurrentIndex =
      combat.participants.findIndex(
        (participant) => {
          return (
            participant.id ===
            currentParticipant.id
          );
        }
      );

    combat.currentTurnIndex =
      newCurrentIndex >= 0
        ? newCurrentIndex
        : 0;
  } else {
    combat.currentTurnIndex = 0;
  }

  updateCurrentCampaign();
  renderCombat();
  closeParticipantModal();
}

function changeParticipantHealth(
  participantId,
  amount
) {
  const combat = campaign.activeCombat;

  if (!combat) {
    return;
  }

  const participant =
    combat.participants.find((item) => {
      return item.id === participantId;
    });

  if (!participant) {
    return;
  }

  participant.health = Math.max(
    0,
    Math.min(
      participant.maxHealth,
      participant.health + amount
    )
  );

  updateCurrentCampaign();
  renderCombat();
}

function removeParticipant(participantId) {
  const combat = campaign.activeCombat;

  if (!combat) {
    return;
  }

  const participant =
    combat.participants.find((item) => {
      return item.id === participantId;
    });

  if (!participant) {
    return;
  }

  const shouldRemove = window.confirm(
    `Remover ${participant.name} do combate?`
  );

  if (!shouldRemove) {
    return;
  }

  combat.participants =
    combat.participants.filter((item) => {
      return item.id !== participantId;
    });

  if (
    combat.currentTurnIndex >=
    combat.participants.length
  ) {
    combat.currentTurnIndex = 0;
  }

  updateCurrentCampaign();
  renderCombat();
}

function goToNextTurn() {
  const combat = campaign.activeCombat;

  if (
    !combat ||
    combat.participants.length === 0
  ) {
    return;
  }

  const isLastParticipant =
    combat.currentTurnIndex ===
    combat.participants.length - 1;

  if (isLastParticipant) {
    combat.currentTurnIndex = 0;
    combat.round += 1;
  } else {
    combat.currentTurnIndex += 1;
  }

  updateCurrentCampaign();
  renderCombat();
}

function goToPreviousTurn() {
  const combat = campaign.activeCombat;

  if (
    !combat ||
    combat.participants.length === 0
  ) {
    return;
  }

  const isFirstParticipant =
    combat.currentTurnIndex === 0;

  if (isFirstParticipant) {
    combat.currentTurnIndex =
      combat.participants.length - 1;

    combat.round = Math.max(
      1,
      combat.round - 1
    );
  } else {
    combat.currentTurnIndex -= 1;
  }

  updateCurrentCampaign();
  renderCombat();
}

function finishCombat() {
  const combat = campaign.activeCombat;

  if (!combat) {
    return;
  }

  const shouldFinish = window.confirm(
    `Encerrar o combate "${combat.name}"?`
  );

  if (!shouldFinish) {
    return;
  }

  campaign.activeCombat = null;

  updateCurrentCampaign();
  renderCombat();
}

/* ========================================
   CLIQUES FORA DOS MODAIS
======================================== */

function handlePlayerOverlayClick(event) {
  if (event.target === linkPlayerModal) {
    closePlayerModal();
  }
}

function handleCombatOverlayClick(event) {
  if (event.target === createCombatModal) {
    closeCombatModal();
  }
}

function handleParticipantOverlayClick(event) {
  if (event.target === participantModal) {
    closeParticipantModal();
  }
}

function handleEscapeKey(event) {
  if (event.key !== "Escape") {
    return;
  }

  if (!participantModal.hidden) {
    closeParticipantModal();
    return;
  }

  if (!createCombatModal.hidden) {
    closeCombatModal();
    return;
  }

  if (!linkPlayerModal.hidden) {
    closePlayerModal();
  }
}

/* ========================================
   CARREGAMENTO
======================================== */

function loadCampaignDashboard() {
  if (!campaign) {
    window.location.href =
      "./campaigns.html";

    return;
  }

  campaignName.textContent =
    campaign.name;

  campaignDescription.textContent =
    campaign.description ||
    "Sem descrição adicionada.";

  quickNotes.value =
    campaign.quickNotes || "";

  if (!Array.isArray(campaign.players)) {
    campaign.players = [];
  }

  updateCurrentCampaign();
  updateNotesCount();
  renderPlayers();
  renderCombat();
}

/* ========================================
   EVENTOS DAS ANOTAÇÕES
======================================== */

quickNotes.addEventListener(
  "input",
  scheduleNotesSave
);

/* ========================================
   EVENTOS DOS JOGADORES
======================================== */

linkPlayerButton.addEventListener(
  "click",
  openPlayerModal
);

emptyLinkPlayerButton.addEventListener(
  "click",
  openPlayerModal
);

closePlayerModalButton.addEventListener(
  "click",
  closePlayerModal
);

cancelPlayerLinkButton.addEventListener(
  "click",
  closePlayerModal
);

linkPlayerModal.addEventListener(
  "click",
  handlePlayerOverlayClick
);

linkPlayerForm.addEventListener(
  "submit",
  handlePlayerSubmit
);

/* ========================================
   EVENTOS DO COMBATE
======================================== */

createCombatButton.addEventListener(
  "click",
  openCombatModal
);

emptyCreateCombatButton.addEventListener(
  "click",
  openCombatModal
);

closeCombatModalButton.addEventListener(
  "click",
  closeCombatModal
);

cancelCombatButton.addEventListener(
  "click",
  closeCombatModal
);

createCombatModal.addEventListener(
  "click",
  handleCombatOverlayClick
);

createCombatForm.addEventListener(
  "submit",
  handleCreateCombat
);

addParticipantButton.addEventListener(
  "click",
  openParticipantModal
);

closeParticipantModalButton.addEventListener(
  "click",
  closeParticipantModal
);

cancelParticipantButton.addEventListener(
  "click",
  closeParticipantModal
);

participantModal.addEventListener(
  "click",
  handleParticipantOverlayClick
);

participantForm.addEventListener(
  "submit",
  handleParticipantSubmit
);

previousTurnButton.addEventListener(
  "click",
  goToPreviousTurn
);

nextTurnButton.addEventListener(
  "click",
  goToNextTurn
);

finishCombatButton.addEventListener(
  "click",
  finishCombat
);

document.addEventListener(
  "keydown",
  handleEscapeKey
);

/* ========================================
   INICIALIZAÇÃO
======================================== */

loadCampaignDashboard();