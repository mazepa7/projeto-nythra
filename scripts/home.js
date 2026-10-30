const authLink =
    document.getElementById("auth-link");

const masterButton =
    document.getElementById("master-button");


document.addEventListener(
    "DOMContentLoaded",
    verificarLogin
);


async function verificarLogin() {

    try {

        const usuario =
            await pegarUsuarioLogado();


        if (!usuario) {
            return;
        }


        /*
        =========================
        LINK DE AUTENTICAÇÃO
        =========================
        */

        if (authLink) {

            authLink.textContent =
                "Minhas fichas";

            /*
            Verifica se estamos dentro da pasta /pages/
            */

            const estaEmPages =
                window.location.pathname.includes("/pages/");


            authLink.href =
                estaEmPages
                    ? "sheets.html"
                    : "pages/sheets.html";

        }


        /*
        =========================
        BOTÃO MESTRE
        =========================
        */

        if (masterButton) {
    const estaEmPages =
        window.location.pathname.includes("/pages/");
            
    masterButton.href = estaEmPages
        ? "campaigns.html"
        : "pages/campaigns.html";
}


    } catch (erro) {

        console.error(
            "Erro ao verificar sessão:",
            erro
        );

    }

}