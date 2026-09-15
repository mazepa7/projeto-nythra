const storageKey =
    "nythra_campaigns";

const params =
    new URLSearchParams(
        window.location.search
    );

const campaignId =
    params.get("id");

const campaignName =
    document.querySelector(
        "#campaign-name"
    );

const campaignDescription =
    document.querySelector(
        "#campaign-description"
    );

const quickNotes =
    document.querySelector(
        "#quick-notes"
    );

const notesStatus =
    document.querySelector(
        "#notes-status"
    );

const notesCount =
    document.querySelector(
        "#notes-count"
    );

let saveTimer = null;

let campaigns =
    loadCampaigns();

let campaign =
    campaigns.find((item) => {
        return item.id === campaignId;
    });

function loadCampaigns() {
    const savedCampaigns =
        localStorage.getItem(
            storageKey
        );

    if (!savedCampaigns) {
        return [];
    }

    try {
        return JSON.parse(
            savedCampaigns
        );
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

function updateNotesCount() {
    const hasNotes =
        quickNotes.value.trim().length > 0;

    notesCount.textContent =
        hasNotes ? "1" : "0";
}

function saveQuickNotes() {
    if (!campaign) {
        return;
    }

    campaign.quickNotes =
        quickNotes.value;

    campaigns = campaigns.map((item) => {
        return item.id === campaign.id
            ? campaign
            : item;
    });

    saveCampaigns();

    notesStatus.textContent =
        "Salvo";

    updateNotesCount();
}

function scheduleNotesSave() {
    notesStatus.textContent =
        "Salvando...";

    clearTimeout(saveTimer);

    saveTimer = setTimeout(
        saveQuickNotes,
        600
    );
}

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

    updateNotesCount();
}

quickNotes.addEventListener(
    "input",
    scheduleNotesSave
);

loadCampaignDashboard();