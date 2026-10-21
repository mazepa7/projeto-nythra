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

let campaigns = [];

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
        campaign.role === "player" ? "Jogador vinculado" : "Mestre";

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
    if (campaign.role === 'player') {
        window.alert('Você está vinculado a esta campanha. O escudo com notas e preparações é exclusivo do mestre.');
        return;
    }
    window.location.href = `./campaign-dashboard.html?id=${encodeURIComponent(campaign.id)}`;
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

async function askForCampaign() {
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

    try {
        await apiRequest('/campaigns', { method: 'POST', body: JSON.stringify({ name: name.trim(), description: description?.trim() || '' }) });
        await refreshCampaigns();
    } catch (error) { window.alert(error.message); }
}
async function refreshCampaigns() {
    const result = await apiRequest('/campaigns');
    campaigns = result.campanhas;
    renderCampaigns();
}
async function initializeCampaigns() {
    try {
        const account = await pegarUsuarioLogado();
        if (!account) { location.href = './login.html'; return; }
        document.querySelector('#account-id').textContent = `Seu ID de jogador: ${account.usuario.id}`;
        await refreshCampaigns();
        const local = JSON.parse(localStorage.getItem('nythra_campaigns') || '[]');
        if (Array.isArray(local) && local.length) document.querySelector('#import-campaigns').hidden = false;
    } catch (error) { document.querySelector('#campaign-message').textContent = error.message; }
}
document.querySelector('#import-campaigns').addEventListener('click', async (event) => {
    if (!confirm('Importar as campanhas deste navegador para sua conta? Jogadores anotados manualmente precisarão ser vinculados por ID.')) return;
    event.target.disabled = true;
    try {
        const local = JSON.parse(localStorage.getItem('nythra_campaigns') || '[]');
        const key = `nythra_imported_${(await pegarUsuarioLogado()).usuario.id}`;
        const imported = JSON.parse(localStorage.getItem(key) || '[]');
        for (const campaign of local) {
            if (imported.includes(campaign.id)) continue;
            await apiRequest('/campaigns', { method: 'POST', body: JSON.stringify(campaign) });
            imported.push(campaign.id);
            localStorage.setItem(key, JSON.stringify(imported));
        }
        event.target.hidden = true;
        await refreshCampaigns();
        document.querySelector('#campaign-message').textContent = 'Campanhas importadas. A cópia local foi preservada.';
    } catch (error) { document.querySelector('#campaign-message').textContent = error.message; }
    finally { event.target.disabled = false; }
});

createCampaignButtons.forEach((button) => {
    button.addEventListener(
        "click",
        askForCampaign
    );
});

initializeCampaigns();
