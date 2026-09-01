// ==============================
// CONFIGURAÇÃO
// ==============================

const classRules = {
    Combatente: {
        pv: [20, 4],
        pe: [2, 2],
        san: [12, 3]
    },

    Especialista: {
        pv: [16, 3],
        pe: [3, 3],
        san: [16, 4]
    },

    Ocultista: {
        pv: [12, 2],
        pe: [4, 4],
        san: [20, 5]
    }
};


const fields =
    document.querySelectorAll(
        "input, select, textarea"
    );


const get = (id) =>
    document.querySelector(`#${id}`);


// ==============================
// ID DA FICHA
// ==============================

const params =
    new URLSearchParams(
        window.location.search
    );


const sheetId =
    params.get("id") ||
    localStorage.getItem(
        "nythra_active_sheet_id"
    );


// ==============================
// CONTROLE DE SALVAMENTO
// ==============================

let saveTimer = null;

let saving = false;

let pendingSave = false;

let sheetLoaded = false;


// ==============================
// INICIALIZAÇÃO
// ==============================

document.addEventListener(
    "DOMContentLoaded",
    inicializarFicha
);


async function inicializarFicha() {

    if (DEV_MODE) {
    preencherFicha({
        name: "Agente de teste",
        system: "ordem_paranormal",
        sheet_data: {}
    });

    updateCalculatedFields();

    sheetLoaded = false;

    alterarStatus("Modo de desenvolvimento");

    bloquearCampos(false);

    return;
}

    if (!sheetId) {

        window.location.href =
            "sheets.html";

        return;

    }


    alterarStatus(
        "Carregando ficha..."
    );


    bloquearCampos(true);


    try {

        // Confirma que existe usuário logado
        const usuario =
            await pegarUsuarioLogado();


        if (
            !usuario ||
            !usuario.usuario
        ) {

            window.location.href =
                "login.html";

            return;

        }


        // Busca ficha no PostgreSQL
        const resposta =
            await buscarFicha(
                sheetId
            );


        if (
            !resposta ||
            !resposta.ficha
        ) {

            throw new Error(
                "Ficha não encontrada."
            );

        }


        const ficha =
            resposta.ficha;


        // Confirma o sistema
        if (
            ficha.system !==
            "ordem_paranormal"
        ) {

            throw new Error(
                "Essa ficha não pertence ao sistema Ordem Paranormal."
            );

        }


        preencherFicha(
            ficha
        );


        updateCalculatedFields();


        sheetLoaded = true;


        alterarStatus(
            "Alterações salvas"
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar ficha:",
            erro
        );


        alterarStatus(
            erro.message ||
            "Erro ao carregar ficha."
        );


    } finally {

        bloquearCampos(false);

    }

}


// ==============================
// PREENCHER HTML COM O BANCO
// ==============================

function preencherFicha(ficha) {

    const data =
        ficha.sheet_data || {};


    // Nome
    get("agent-name").value =
        ficha.name ||
        "Novo agente";


    // Dados básicos
    get("player-name").value =
        data.jogador || "";


    get("origin").value =
        data.origem || "";


    // Classe
    if (
        data.classe &&
        classRules[data.classe]
    ) {

        get("character-class").value =
            data.classe;

    }


    // NEX
    if (
        data.nex !== undefined &&
        data.nex !== null
    ) {

        get("nex").value =
            String(data.nex);

    }


    // ==============================
    // ATRIBUTOS
    // ==============================

    const atributos =
        data.atributos || {};


    get("agi").value =
        atributos.agilidade ?? 1;


    get("for").value =
        atributos.forca ?? 1;


    get("int").value =
        atributos.intelecto ?? 1;


    get("pre").value =
        atributos.presenca ?? 1;


    get("vig").value =
        atributos.vigor ?? 1;


    // ==============================
    // DEFESA
    // ==============================

    get("defense").value =
        data.defesa ?? 10;


    // ==============================
    // DETALHES
    // ==============================

    get("trail").value =
        data.trilha || "";


    get("rank").value =
        data.patente || "Recruta";


    get("description").value =
        data.descricao || "";


    // ==============================
    // RECURSOS
    // ==============================

    get("current-pv").value =
        data.pv?.atual ?? 0;


    get("current-pe").value =
        data.pe?.atual ?? 0;


    get("current-san").value =
        data.sanidade?.atual ?? 0;


    // ==============================
    // PERÍCIAS
    // ==============================

    const pericias =
        data.pericias || {};


    document
        .querySelectorAll(
            "[data-skill]"
        )
        .forEach((field) => {

            const skill =
                field.dataset.skill;


            field.value =
                pericias[skill] ?? 0;

        });

}


// ==============================
// CÁLCULOS
// ==============================

function getAdvancements(nex) {

    return nex === 99
        ? 19
        : Math.max(
            0,
            Math.floor(nex / 5) - 1
        );

}


function numberValue(id) {

    return Math.max(
        0,
        Number(
            get(id).value
        ) || 0
    );

}


function calculatedStats() {

    const selectedClass =
        get(
            "character-class"
        ).value;


    const rules =
        classRules[selectedClass] ||
        classRules.Combatente;


    const advances =
        getAdvancements(
            Number(
                get("nex").value
            )
        );


    const vigor =
        numberValue("vig");


    const presence =
        numberValue("pre");


    return {

        pv:
            rules.pv[0] +
            vigor +
            advances *
                (
                    rules.pv[1] +
                    vigor
                ),

        pe:
            rules.pe[0] +
            presence +
            advances *
                (
                    rules.pe[1] +
                    presence
                ),

        san:
            rules.san[0] +
            advances *
                rules.san[1],

        advances,

        vigor,

        presence,

        rules

    };

}


// ==============================
// RECURSOS
// ==============================

function updateResource(
    resource,
    maximum
) {

    const current =
        get(
            `current-${resource}`
        );


    const output =
        get(
            `max-${resource}`
        );


    const bar =
        get(
            `${resource}-bar`
        );


    const safeCurrent =
        Math.min(
            maximum,
            Math.max(
                0,
                Number(
                    current.value
                ) || 0
            )
        );


    current.max =
        maximum;


    current.value =
        safeCurrent;


    output.value =
        maximum;


    bar.style.width =
        `${
            maximum
                ? (
                    safeCurrent /
                    maximum
                ) * 100
                : 0
        }%`;

}


// ==============================
// ATUALIZA CAMPOS CALCULADOS
// ==============================

function updateCalculatedFields() {

    const stats =
        calculatedStats();


    updateResource(
        "pv",
        stats.pv
    );


    updateResource(
        "pe",
        stats.pe
    );


    updateResource(
        "san",
        stats.san
    );


    const suffix =
        stats.advances
            ? ` + ${stats.advances} avanço${
                stats.advances > 1
                    ? "s"
                    : ""
            }`
            : "";


    get(
        "pv-formula"
    ).textContent =
        `${stats.rules.pv[0]} + ${stats.vigor} de Vigor${suffix}`;


    get(
        "pe-formula"
    ).textContent =
        `${stats.rules.pe[0]} + ${stats.presence} de Presença${suffix}`;


    get(
        "san-formula"
    ).textContent =
        `${stats.rules.san[0]} inicial${
            suffix
                ? `${suffix} de NEX`
                : ""
        }`;

}


// ==============================
// GERAR OBJETO PARA O BANCO
// ==============================

function coletarDadosDaFicha() {

    const stats =
        calculatedStats();


    const pericias = {};


    document
        .querySelectorAll(
            "[data-skill]"
        )
        .forEach((field) => {

            pericias[
                field.dataset.skill
            ] =
                Math.max(
                    0,
                    Number(
                        field.value
                    ) || 0
                );

        });


    return {

        nex:
            Number(
                get("nex").value
            ),

        classe:
            get(
                "character-class"
            ).value,

        jogador:
            get(
                "player-name"
            ).value.trim(),

        origem:
            get(
                "origin"
            ).value.trim(),

        trilha:
            get(
                "trail"
            ).value.trim(),

        patente:
            get(
                "rank"
            ).value.trim(),

        descricao:
            get(
                "description"
            ).value,

        atributos: {

            agilidade:
                numberValue("agi"),

            forca:
                numberValue("for"),

            intelecto:
                numberValue("int"),

            presenca:
                numberValue("pre"),

            vigor:
                numberValue("vig")

        },

        defesa:
            numberValue(
                "defense"
            ),

        pv: {

            atual:
                numberValue(
                    "current-pv"
                ),

            maximo:
                stats.pv

        },

        pe: {

            atual:
                numberValue(
                    "current-pe"
                ),

            maximo:
                stats.pe

        },

        sanidade: {

            atual:
                numberValue(
                    "current-san"
                ),

            maximo:
                stats.san

        },

        pericias

    };

}


// ==============================
// AGENDAR SALVAMENTO
// ==============================

function agendarSalvamento(
    delay = 650
) {

    if (!sheetLoaded) {
        return;
    }


    alterarStatus(
        "Alterações não salvas"
    );


    clearTimeout(
        saveTimer
    );


    saveTimer =
        setTimeout(
            salvarFichaNoBanco,
            delay
        );

}


// ==============================
// SALVAR NO POSTGRESQL
// ==============================

async function salvarFichaNoBanco() {

    if (!sheetLoaded) {
        return;
    }


    if (saving) {

        pendingSave = true;

        return;

    }


    saving = true;


    alterarStatus(
        "Salvando..."
    );


    try {

        const nome =
            get(
                "agent-name"
            )
                .value
                .trim() ||
            "Sem nome";


        const sheetData =
            coletarDadosDaFicha();


        await salvarFicha(
            sheetId,
            nome,
            sheetData
        );


        alterarStatus(
            "Alterações salvas"
        );


    } catch (erro) {

        console.error(
            "Erro ao salvar ficha:",
            erro
        );


        alterarStatus(
            "Erro ao salvar"
        );


    } finally {

        saving = false;


        if (pendingSave) {

            pendingSave = false;

            salvarFichaNoBanco();

        }

    }

}


// ==============================
// EVENTOS DOS CAMPOS
// ==============================

fields.forEach((field) => {

    field.addEventListener(
        "input",
        () => {

            if (!sheetLoaded) {
                return;
            }


            updateCalculatedFields();


            agendarSalvamento(
                650
            );

        }
    );


    field.addEventListener(
        "change",
        () => {

            if (!sheetLoaded) {
                return;
            }


            updateCalculatedFields();


            agendarSalvamento(
                100
            );

        }
    );

});


// ==============================
// STATUS
// ==============================

function alterarStatus(texto) {

    const status =
        get("save-status");


    if (!status) {
        return;
    }


    status.textContent =
        texto;

}


// ==============================
// BLOQUEAR CAMPOS
// ==============================

function bloquearCampos(
    bloquear
) {

    fields.forEach(
        (field) => {

            field.disabled =
                bloquear;

        }
    );

}

// ==============================
// SISTEMA DE ROLAGENS
// ==============================

const attributeNames = {
    agi: "AGILIDADE",
    for: "FORÇA",
    int: "INTELECTO",
    pre: "PRESENÇA",
    vig: "VIGOR"
};


let rollResultTimer = null;


// ==============================
// ROLAR D20
// ==============================

function rollD20() {

    return Math.floor(
        Math.random() * 20
    ) + 1;

}


// ==============================
// ROLAR PERÍCIA
// ==============================

function rollSkill(button) {

    const row =
        button.closest(
            ".skill-row"
        );


    if (!row) {
        return;
    }


    const skillName =
        button.dataset.rollSkill;


    const attributeSelect =
        row.querySelector(
            ".skill-attribute"
        );


    const skillInput =
        row.querySelector(
            "[data-skill]"
        );


    if (
        !attributeSelect ||
        !skillInput
    ) {
        return;
    }


    const attribute =
        attributeSelect.value;


    const attributeValue =
        numberValue(
            attribute
        );


    const skillBonus =
        Math.max(
            0,
            Number(
                skillInput.value
            ) || 0
        );


    // Ordem Paranormal:
    // valor do atributo = quantidade de d20

    const diceAmount =
        Math.max(
            1,
            attributeValue
        );


    const rolls = [];


    for (
        let i = 0;
        i < diceAmount;
        i++
    ) {

        rolls.push(
            rollD20()
        );

    }


    const bestRoll =
        Math.max(
            ...rolls
        );


    const total =
        bestRoll +
        skillBonus;


    showRollResult({
        skillName,
        attribute,
        attributeValue,
        skillBonus,
        rolls,
        bestRoll,
        total
    });

}


// ==============================
// MOSTRAR RESULTADO
// ==============================

function showRollResult({
    skillName,
    attribute,
    attributeValue,
    skillBonus,
    rolls,
    bestRoll,
    total
}) {

    const result =
        get(
            "roll-result"
        );


    const skillNameElement =
        get(
            "roll-skill-name"
        );


    const attributeElement =
        get(
            "roll-attribute"
        );


    const diceElement =
        get(
            "roll-dice"
        );


    const totalElement =
        get(
            "roll-total"
        );


    if (
        !result ||
        !skillNameElement ||
        !attributeElement ||
        !diceElement ||
        !totalElement
    ) {
        return;
    }


    skillNameElement.textContent =
        skillName;


    attributeElement.textContent =
        `${attributeNames[attribute]} · ${attributeValue}d20 · +${skillBonus}`;


    diceElement.innerHTML = "";


    let bestAlreadyMarked = false;


    rolls.forEach(
        (roll) => {

            const die =
                document.createElement(
                    "span"
                );


            die.className =
                "roll-die";


            die.textContent =
                roll;


            if (
                roll === bestRoll &&
                !bestAlreadyMarked
            ) {

                die.classList.add(
                    "best"
                );


                bestAlreadyMarked =
                    true;

            }


            diceElement.appendChild(
                die
            );

        }
    );


    totalElement.textContent =
        total;


    result.setAttribute(
        "aria-hidden",
        "false"
    );


    // Reinicia animação caso o jogador
    // role várias perícias rapidamente.

    result.classList.remove(
        "show"
    );


    requestAnimationFrame(
        () => {

            result.classList.add(
                "show"
            );

        }
    );


    clearTimeout(
        rollResultTimer
    );


    rollResultTimer =
        setTimeout(
            hideRollResult,
            5000
        );

}


// ==============================
// ESCONDER RESULTADO
// ==============================

function hideRollResult() {

    const result =
        get(
            "roll-result"
        );


    if (!result) {
        return;
    }


    result.classList.remove(
        "show"
    );


    result.setAttribute(
        "aria-hidden",
        "true"
    );

}


// ==============================
// EVENTOS DAS PERÍCIAS
// ==============================

document
    .querySelectorAll(
        "[data-roll-skill]"
    )
    .forEach(
        (button) => {

            button.addEventListener(
                "click",
                () => {

                    rollSkill(
                        button
                    );

                }
            );

        }
    );

    /* =========================
   ABAS DE COMBATE
========================= */

const combatTabs =
    document.querySelectorAll("[data-combat-tab]");

const combatPanels =
    document.querySelectorAll("[data-combat-panel]");


function changeCombatTab(tabName) {

    combatTabs.forEach((tab) => {

        const isActive =
            tab.dataset.combatTab === tabName;

        tab.classList.toggle(
            "active",
            isActive
        );

        tab.setAttribute(
            "aria-selected",
            isActive
        );

    });


    combatPanels.forEach((panel) => {

        const isActive =
            panel.dataset.combatPanel === tabName;

        panel.classList.toggle(
            "active",
            isActive
        );

        panel.hidden = !isActive;

    });

}


combatTabs.forEach((tab) => {

    tab.addEventListener("click", () => {

        changeCombatTab(
            tab.dataset.combatTab
        );

    });

});