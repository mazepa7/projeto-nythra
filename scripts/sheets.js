// ==============================
// ELEMENTOS
// ==============================

const userName =
    document.getElementById("user-name");

const userAvatar =
    document.getElementById("user-avatar");

const logoutButton =
    document.getElementById("logout-button");


const loadingState =
    document.getElementById("loading-state");

const emptyState =
    document.getElementById("empty-state");

const sheetsSection =
    document.getElementById("sheets-section");

const sheetsGrid =
    document.getElementById("sheets-grid");

const sheetCount =
    document.getElementById("sheet-count");


const newSheetButton =
    document.getElementById("new-sheet-button");

const emptyCreateButton =
    document.getElementById("empty-create-button");


const createModal =
    document.getElementById("create-modal");

const closeModalButton =
    document.getElementById("close-modal-button");

const cancelCreateButton =
    document.getElementById("cancel-create-button");


const createSheetForm =
    document.getElementById("create-sheet-form");

const characterNameInput =
    document.getElementById("character-name");

const characterSystemInput =
    document.getElementById("character-system");

const createSheetButton =
    document.getElementById("create-sheet-button");

const createMessage =
    document.getElementById("create-message");


const toast =
    document.getElementById("toast");


// ==============================
// INICIALIZAÇÃO
// ==============================

document.addEventListener(
    "DOMContentLoaded",
    inicializarPagina
);


async function inicializarPagina() {

    try {

        await carregarUsuario();

        await carregarFichas();

    } catch (erro) {

        console.error(
            "Erro ao inicializar página:",
            erro
        );

        mostrarToast(
            "Não foi possível carregar a página.",
            "erro"
        );

    }

}


// ==============================
// USUÁRIO LOGADO
// ==============================

async function carregarUsuario() {

    const resposta =
        await pegarUsuarioLogado();


    if (!resposta || !resposta.usuario) {

        window.location.href =
            "login.html";

        return;

    }


    const usuario =
        resposta.usuario;


    userName.textContent =
        usuario.username;


    const primeiraLetra =
        usuario.username
            .charAt(0)
            .toUpperCase();


    userAvatar.textContent =
        primeiraLetra;

}


// ==============================
// CARREGAR FICHAS
// ==============================

async function carregarFichas() {

    mostrarLoading();


    try {

        const resposta =
            await listarFichas();


        const fichas =
            resposta.fichas || [];


        esconderLoading();


        if (fichas.length === 0) {

            mostrarEstadoVazio();

            return;

        }


        mostrarLista();


        renderizarFichas(
            fichas
        );


    } catch (erro) {

        esconderLoading();


        console.error(
            "Erro ao carregar fichas:",
            erro
        );


        mostrarEstadoVazio();


        mostrarToast(
            erro.message ||
            "Não foi possível carregar suas fichas.",
            "erro"
        );

    }

}


// ==============================
// RENDERIZAR FICHAS
// ==============================

function renderizarFichas(fichas) {

    sheetsGrid.innerHTML = "";


    sheetCount.textContent =
        formatarQuantidade(
            fichas.length
        );


    fichas.forEach((ficha) => {

        const card =
            criarCardFicha(ficha);


        sheetsGrid.appendChild(card);

    });

}


// ==============================
// CRIAR CARD
// ==============================

function criarCardFicha(ficha) {

    const card =
        document.createElement("article");


    card.className =
        "sheet-card";


    // HEADER

    const header =
        document.createElement("div");


    header.className =
        "sheet-card-header";


    const systemBadge =
        document.createElement("span");


    systemBadge.className =
        "system-badge";


    systemBadge.textContent =
        formatarSistema(
            ficha.system
        );


    const deleteButton =
        document.createElement("button");


    deleteButton.className =
        "delete-button";


    deleteButton.type =
        "button";


    deleteButton.title =
        "Excluir ficha";


    deleteButton.setAttribute(
        "aria-label",
        `Excluir ficha ${ficha.name}`
    );


    deleteButton.textContent =
        "×";


    deleteButton.addEventListener(
        "click",
        () => deletarFicha(ficha)
    );


    header.append(
        systemBadge,
        deleteButton
    );


    // CONTEÚDO

    const content =
        document.createElement("div");


    const name =
        document.createElement("h3");


    name.className =
        "sheet-name";


    name.textContent =
        ficha.name;


    const meta =
        document.createElement("p");


    meta.className =
        "sheet-meta";


    const classe =
        ficha.sheet_data?.classe ||
        "Classe não definida";


    const nex =
        ficha.sheet_data?.nex;


    const classeElement =
        document.createElement("span");


    classeElement.className =
        "sheet-meta-item";


    classeElement.textContent =
        classe;


    meta.appendChild(
        classeElement
    );


    if (
        nex !== undefined &&
        nex !== null
    ) {

        const nexElement =
            document.createElement("span");


        nexElement.className =
            "sheet-meta-item";


        nexElement.textContent =
            `NEX ${nex}%`;


        meta.appendChild(
            nexElement
        );

    }


    content.append(
        name,
        meta
    );


    // FOOTER

    const footer =
        document.createElement("div");


    footer.className =
        "sheet-card-footer";


    const updatedAt =
        document.createElement("span");


    updatedAt.className =
        "updated-at";


    updatedAt.textContent =
        `Atualizada ${formatarData(
            ficha.updated_at
        )}`;


    const openButton =
        document.createElement("button");


    openButton.className =
        "button button-secondary open-sheet-button";


    openButton.type =
        "button";


    openButton.textContent =
        "Abrir ficha";


    openButton.addEventListener(
        "click",
        () => abrirFicha(ficha)
    );


    footer.append(
        updatedAt,
        openButton
    );


    card.append(
        header,
        content,
        footer
    );


    return card;

}


// ==============================
// ABRIR FICHA
// ==============================

function abrirFicha(ficha) {

    localStorage.setItem(
        "nythra_active_sheet_id",
        ficha.id
    );


    switch (ficha.system) {

        case "ordem_paranormal":

    window.location.href =
        `character-sheet.html?id=${ficha.id}`;

    break;


        default:

            mostrarToast(
                "Esse sistema ainda não possui uma página de ficha.",
                "erro"
            );

    }

}


// ==============================
// NOVA FICHA
// ==============================

newSheetButton.addEventListener(
    "click",
    abrirModal
);


emptyCreateButton.addEventListener(
    "click",
    abrirModal
);


function abrirModal() {

    limparMensagemCriacao();


    createSheetForm.reset();


    characterSystemInput.value =
        "ordem_paranormal";


    createModal.classList.remove(
        "hidden"
    );


    createModal.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    setTimeout(() => {

        characterNameInput.focus();

    }, 50);

}


// ==============================
// FECHAR MODAL
// ==============================

closeModalButton.addEventListener(
    "click",
    fecharModal
);


cancelCreateButton.addEventListener(
    "click",
    fecharModal
);


function fecharModal() {

    createModal.classList.add(
        "hidden"
    );


    createModal.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";

}


// Fecha clicando fora

createModal.addEventListener(
    "click",
    (event) => {

        if (
            event.target === createModal
        ) {

            fecharModal();

        }

    }
);


// Fecha com ESC

document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            !createModal.classList.contains(
                "hidden"
            )
        ) {

            fecharModal();

        }

    }
);


// ==============================
// CRIAR FICHA NO BANCO
// ==============================

createSheetForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        limparMensagemCriacao();


        const name =
            characterNameInput
                .value
                .trim();


        const system =
            characterSystemInput.value;


        if (!name) {

            mostrarMensagemCriacao(
                "Digite o nome do personagem.",
                "erro"
            );

            return;

        }


        if (
            name.length < 2 ||
            name.length > 80
        ) {

            mostrarMensagemCriacao(
                "O nome deve ter entre 2 e 80 caracteres.",
                "erro"
            );

            return;

        }


        try {

            bloquearCriacao();


            const sheetData =
                criarDadosIniciais(system);


            const resposta =
                await criarFicha(
                    system,
                    name,
                    sheetData
                );


            mostrarMensagemCriacao(
                "Ficha criada com sucesso!",
                "sucesso"
            );


            mostrarToast(
                `${name} foi criado.`,
                "sucesso"
            );


            setTimeout(() => {

                fecharModal();


                abrirFicha(
                    resposta.ficha
                );

            }, 500);


        } catch (erro) {

            console.error(
                "Erro ao criar ficha:",
                erro
            );


            mostrarMensagemCriacao(
                erro.message ||
                "Não foi possível criar a ficha.",
                "erro"
            );


        } finally {

            desbloquearCriacao();

        }

    }
);


// ==============================
// DADOS INICIAIS DA FICHA
// ==============================

function criarDadosIniciais(system) {

    if (
        system === "ordem_paranormal"
    ) {

        return {

            nex: 5,

            classe: "",

            origem: "",

            trilha: "",

            atributos: {

                agilidade: 1,

                forca: 1,

                intelecto: 1,

                presenca: 1,

                vigor: 1

            },

            pv: {

                atual: 0,

                maximo: 0

            },

            pe: {

                atual: 0,

                maximo: 0

            },

            sanidade: {

                atual: 0,

                maximo: 0

            }

        };

    }


    return {};

}


// ==============================
// EXCLUIR FICHA
// ==============================

async function deletarFicha(ficha) {

    const confirmou =
        window.confirm(
            `Tem certeza que deseja excluir "${ficha.name}"?\n\nEssa ação não pode ser desfeita.`
        );


    if (!confirmou) {

        return;

    }


    try {

        await excluirFicha(
            ficha.id
        );


        mostrarToast(
            `${ficha.name} foi excluído.`,
            "sucesso"
        );


        await carregarFichas();


    } catch (erro) {

        console.error(
            "Erro ao excluir ficha:",
            erro
        );


        mostrarToast(
            erro.message ||
            "Não foi possível excluir a ficha.",
            "erro"
        );

    }

}


// ==============================
// LOGOUT
// ==============================

logoutButton.addEventListener(
    "click",
    () => {

        logout();


        window.location.href =
            "login.html";

    }
);


// ==============================
// ESTADOS VISUAIS
// ==============================

function mostrarLoading() {

    loadingState.classList.remove(
        "hidden"
    );


    emptyState.classList.add(
        "hidden"
    );


    sheetsSection.classList.add(
        "hidden"
    );

}


function esconderLoading() {

    loadingState.classList.add(
        "hidden"
    );

}


function mostrarEstadoVazio() {

    sheetsSection.classList.add(
        "hidden"
    );


    emptyState.classList.remove(
        "hidden"
    );

}


function mostrarLista() {

    emptyState.classList.add(
        "hidden"
    );


    sheetsSection.classList.remove(
        "hidden"
    );

}


// ==============================
// FORMULÁRIO
// ==============================

function bloquearCriacao() {

    createSheetButton.disabled =
        true;


    createSheetButton.textContent =
        "Criando...";

}


function desbloquearCriacao() {

    createSheetButton.disabled =
        false;


    createSheetButton.textContent =
        "Criar ficha";

}


function mostrarMensagemCriacao(
    texto,
    tipo
) {

    createMessage.textContent =
        texto;


    createMessage.classList.remove(
        "hidden",
        "form-message-error",
        "form-message-success"
    );


    if (
        tipo === "erro"
    ) {

        createMessage.classList.add(
            "form-message-error"
        );

    }


    if (
        tipo === "sucesso"
    ) {

        createMessage.classList.add(
            "form-message-success"
        );

    }

}


function limparMensagemCriacao() {

    createMessage.textContent =
        "";


    createMessage.classList.add(
        "hidden"
    );


    createMessage.classList.remove(
        "form-message-error",
        "form-message-success"
    );

}


// ==============================
// SISTEMAS
// ==============================

function formatarSistema(system) {

    const sistemas = {

        ordem_paranormal:
            "Ordem Paranormal",

        dnd:
            "Dungeons & Dragons",

        jjk:
            "Jujutsu Kaisen"

    };


    return (
        sistemas[system] ||
        system
    );

}


// ==============================
// QUANTIDADE
// ==============================

function formatarQuantidade(
    quantidade
) {

    if (
        quantidade === 1
    ) {

        return "1 ficha";

    }


    return `${quantidade} fichas`;

}


// ==============================
// DATA
// ==============================

function formatarData(data) {

    if (!data) {

        return "recentemente";

    }


    const dataObjeto =
        new Date(data);


    if (
        Number.isNaN(
            dataObjeto.getTime()
        )
    ) {

        return "recentemente";

    }


    return new Intl.DateTimeFormat(
        "pt-BR",
        {

            day: "2-digit",

            month: "short",

            year: "numeric"

        }

    ).format(dataObjeto);

}


// ==============================
// TOAST
// ==============================

let toastTimeout;


function mostrarToast(
    mensagem,
    tipo = "sucesso"
) {

    clearTimeout(
        toastTimeout
    );


    toast.textContent =
        mensagem;


    toast.classList.remove(
        "hidden",
        "toast-success",
        "toast-error"
    );


    if (
        tipo === "sucesso"
    ) {

        toast.classList.add(
            "toast-success"
        );

    } else {

        toast.classList.add(
            "toast-error"
        );

    }


    toastTimeout =
        setTimeout(() => {

            toast.classList.add(
                "hidden"
            );

        }, 3500);

}