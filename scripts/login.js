const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const rememberInput = document.getElementById("remember");

const loginButton = document.getElementById("login-button");
const loginMessage = document.getElementById("login-message");


loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    limparMensagem();

    if (!email || !password) {
        mostrarMensagem(
            "Preencha seu e-mail e sua senha.",
            "erro"
        );

        return;
    }

    try {
        bloquearFormulario();

        const resultado = await fazerLogin(
            email,
            password
        );

        mostrarMensagem(
            `Bem-vindo, ${resultado.usuario.username}!`,
            "sucesso"
        );

        console.log("Usuário logado:", resultado.usuario);

        setTimeout(() => {
            window.location.href = "../index.html";
        }, 700);

    } catch (erro) {

        mostrarMensagem(
            erro.message || "Não foi possível fazer login.",
            "erro"
        );

    } finally {

        desbloquearFormulario();

    }
});


function bloquearFormulario() {
    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";
}


function desbloquearFormulario() {
    loginButton.disabled = false;
    loginButton.textContent = "Entrar";
}


function mostrarMensagem(texto, tipo) {
    loginMessage.textContent = texto;

    loginMessage.classList.remove(
        "hidden",
        "form-message-error",
        "form-message-success"
    );

    if (tipo === "erro") {
        loginMessage.classList.add("form-message-error");
    }

    if (tipo === "sucesso") {
        loginMessage.classList.add("form-message-success");
    }
}


function limparMensagem() {
    loginMessage.textContent = "";

    loginMessage.classList.add("hidden");

    loginMessage.classList.remove(
        "form-message-error",
        "form-message-success"
    );
}