const storageKey = "nythra_campaigns";

const params = new URLSearchParams(
  window.location.search
);

const campaignId = params.get("id");

/* ========================================
   ELEMENTOS DA CAMPANHA
======================================== */

const campaignName = document.querySelector(
  "#campaign-name"
);

const campaignDescription = document.querySelector(
  "#campaign-description"
);

/* ========================================
   ELEMENTOS DAS ANOTAÇÕES
======================================== */

const quickNotes = document.querySelector(
  "#quick-notes"
);

const notesStatus = document.querySelector(
  "#notes-status"
);

const notesCount = document.querySelector(
  "#notes-count"
);

/* ========================================
   ELEMENTOS DOS JOGADORES
======================================== */

const playersCount = document.querySelector(
  "#players-count"
);

const playersEmptyState = document.querySelector(
  "#players-empty-state"
);

const playersGrid = document.querySelector(
  "#players-grid"
);

const linkPlayerButton = document.querySelector(
  "#link-player-button"
);

const emptyLinkPlayerButton = document.querySelector(
  "#empty-link-player-button"
);

/* ========================================
   ELEMENTOS DO MODAL
======================================== */

const linkPlayerModal = document.querySelector(
  "#link-player-modal"
);

const closePlayerModalButton = document.querySelector(
  "#close-player-modal"
);

const cancelPlayerLinkButton = document.querySelector(
  "#cancel-player-link"
);

const linkPlayerForm = document.querySelector(
  "#link-player-form"
);

const playerNameInput = document.querySelector(
  "#player-name"
);

const characterNameInput = document.querySelector(
  "#character-name"
);

const characterOriginInput = document.querySelector(
  "#character-origin"
);

const characterClassInput = document.querySelector(
  "#character-class"
);

const characterNexInput = document.querySelector(
  "#character-nex"
);

/* ========================================
   ESTADO DA PÁGINA
======================================== */

let saveTimer = null;

let campaigns = loadCampaigns();

let campaign = campaigns.find((item) => {
  return String(item.id) === String(campaignId);
});

/* ========================================
   LOCALSTORAGE
======================================== */

function loadCampaigns() {
  const savedCampaigns = localStorage.getItem(
    storageKey
  );

  if (!savedCampaigns) {
    return [];
  }

  try {
    const parsedCampaigns = JSON.parse(
      savedCampaigns
    );

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
   MODAL DE JOGADORES
======================================== */

function openPlayerModal() {
  linkPlayerModal.hidden = false;

  document.body.style.overflow = "hidden";

  window.requestAnimationFrame(() => {
    playerNameInput.focus();
  });
}

function closePlayerModal() {
  linkPlayerModal.hidden = true;

  document.body.style.overflow = "";

  linkPlayerForm.reset();
}

function handleModalOverlayClick(event) {
  if (event.target === linkPlayerModal) {
    closePlayerModal();
  }
}

function handleModalKeydown(event) {
  if (
    event.key === "Escape" &&
    !linkPlayerModal.hidden
  ) {
    closePlayerModal();
  }
}

/* ========================================
   ELEMENTOS AUXILIARES
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

function createPlayerId() {
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

function getPlayerInitials(characterName) {
  const words = characterName
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

/* ========================================
   RECURSOS DO JOGADOR
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

/* ========================================
   CARD DO JOGADOR
======================================== */

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
    getPlayerInitials(player.characterName)
  );

  avatar.setAttribute(
    "aria-hidden",
    "true"
  );

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

  cardHeader.append(
    identity,
    nex
  );

  const details = createElement(
    "div",
    "player-details"
  );

  const characterClass = createElement(
    "span",
    "player-detail",
    player.characterClass
  );

  const characterOrigin = createElement(
    "span",
    "player-detail",
    player.characterOrigin ||
      "Origem não informada"
  );

  details.append(
    characterClass,
    characterOrigin
  );

  const resources = createElement(
    "div",
    "player-resources"
  );

  const health = createResourceElement(
    "PV",
    player.health,
    "health"
  );

  const sanity = createResourceElement(
    "SAN",
    player.sanity,
    "sanity"
  );

  const effort = createResourceElement(
    "PE",
    player.effort,
    "effort"
  );

  resources.append(
    health,
    sanity,
    effort
  );

  const actions = createElement(
    "footer",
    "player-card-actions"
  );

  const resourceNotice = createElement(
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

  removeButton.addEventListener(
    "click",
    () => {
      removePlayer(player.id);
    }
  );

  actions.append(
    resourceNotice,
    removeButton
  );

  card.append(
    cardHeader,
    details,
    resources,
    actions
  );

  return card;
}

/* ========================================
   RENDERIZAÇÃO DOS JOGADORES
======================================== */

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

  playersEmptyState.hidden =
    hasPlayers;

  playersGrid.hidden =
    !hasPlayers;

  campaign.players.forEach((player) => {
    const playerCard =
      createPlayerCard(player);

    playersGrid.appendChild(
      playerCard
    );
  });
}

/* ========================================
   CADASTRAR JOGADOR
======================================== */

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
    id: createPlayerId(),
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

  if (!Array.isArray(campaign.players)) {
    campaign.players = [];
  }

  campaign.players.push(newPlayer);

  updateCurrentCampaign();

  renderPlayers();

  closePlayerModal();
}

/* ========================================
   REMOVER JOGADOR
======================================== */

function removePlayer(playerId) {
  if (!campaign) {
    return;
  }

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
   CARREGAMENTO DA CAMPANHA
======================================== */

function loadCampaignDashboard() {
  if (!campaign) {
    window.location.href =
      "./campaigns.html";

    return false;
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

    updateCurrentCampaign();
  }

  updateNotesCount();

  renderPlayers();

  return true;
}

/* ========================================
   EVENTOS
======================================== */

quickNotes.addEventListener(
  "input",
  scheduleNotesSave
);

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
  handleModalOverlayClick
);

linkPlayerForm.addEventListener(
  "submit",
  handlePlayerSubmit
);

document.addEventListener(
  "keydown",
  handleModalKeydown
);

/* ========================================
   INICIALIZAÇÃO
======================================== */

loadCampaignDashboard();