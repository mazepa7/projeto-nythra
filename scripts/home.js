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


        // Usuário já está logado
        authLink.textContent =
            "Minhas fichas";


        authLink.href =
            "pages/sheets.html";


        /*
        Enquanto ainda não existe a área de Mestre,
        mantemos esse botão levando às fichas.
        Depois podemos trocar por campaigns.html.
        */

        masterButton.href =
            "pages/sheets.html";


    } catch (erro) {

        console.error(
            "Erro ao verificar sessão:",
            erro
        );

    }

}