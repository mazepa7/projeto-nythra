const campaignsList =
    document.querySelector(
        "#campaigns-list"
    );

const campaignsEmpty =
    document.querySelector(
        "#campaigns-empty"
    );

const createCampaignButtons =
    document.querySelectorAll(
        "[data-create-campaign], #create-campaign-button"
    );

const storageKey =
    "nythra_campaigns";

let campaigns =
    loadCampaigns();

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

function formatDate(date) {
    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    ).format(
        new Date(date)
    );
}

function createCampaignCard(campaign) {
    const card =
        document.createElement(
            "article"
        );

    card.className =
        "campaign-card";

    const eyebrow =
        document.createElement(
            "p"
        );

    eyebrow.className =
        "eyebrow";

    eyebrow.textContent =
        "Campanha";

    const title =
        document.createElement(
            "h3"
        );

    title.textContent =
        campaign.name;

    const description =
        document.createElement(
            "p"
        );

    description.className =
        "campaign-card-description";

    description.textContent =
        campaign.description ||
        "Nenhuma descrição adicionada.";

    const footer =
        document.createElement(
            "div"
        );

    footer.className =
        "campaign-card-footer";

    const date =
        document.createElement(
            "span"
        );

    date.textContent =
        `Criada em ${formatDate(campaign.createdAt)}`;

    const status =
        document.createElement(
            "span"
        );

    status.className =
        "campaign-card-status";

    status.textContent =
        "Em preparação";

    footer.append(
        date,
        status
    );

    card.append(
        eyebrow,
        title,
        description,
        footer
    );

    function openCampaign() {
    window.location.href =
        `./campaign-dashboard.html?id=${encodeURIComponent(campaign.id)}`;
}

card.tabIndex = 0;

card.setAttribute(
    "role",
    "link"
);

card.addEventListener(
    "click",
    openCampaign
);

card.addEventListener(
    "keydown",
    (event) => {
        if (
            event.key === "Enter" ||
            event.key === " "
        ) {
            event.preventDefault();

            openCampaign();
        }
    }
);

    return card;
}

function renderCampaigns() {
    document
        .querySelectorAll(
            ".campaign-card"
        )
        .forEach((card) => {
            card.remove();
        });

    campaignsEmpty.hidden =
        campaigns.length > 0;

    campaigns.forEach((campaign) => {
        campaignsList.appendChild(
            createCampaignCard(campaign)
        );
    });
}

function askForCampaign() {
    const name =
        window.prompt(
            "Qual é o nome da campanha?"
        );

    if (!name || !name.trim()) {
        return;
    }

    const description =
        window.prompt(
            "Escreva uma descrição curta para ela (opcional):"
        );

    const campaign = {
        id: crypto.randomUUID(),
        name: name.trim(),
        description:
            description?.trim() || "",
        createdAt:
            new Date().toISOString()
    };

    campaigns.unshift(campaign);

    saveCampaigns();

    renderCampaigns();
}

createCampaignButtons.forEach((button) => {
    button.addEventListener(
        "click",
        askForCampaign
    );
});

renderCampaigns();