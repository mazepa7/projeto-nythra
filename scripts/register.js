const registerForm = document.getElementById("register-form");

const usernameInput = document.getElementById("username");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPasswordInput =
    document.getElementById("confirm-password");

const registerButton =
    document.getElementById("register-button");

const registerMessage =
    document.getElementById("register-message");


registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    limparMensagem();

    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;


    if (!username || !email || !password || !confirmPassword) {

        mostrarMensagem(
            "Preencha todos os campos.",
            "erro"
        );

        return;
    }


    if (username.length < 3) {

        mostrarMensagem(
            "O nome de usuário deve ter pelo menos 3 caracteres.",
            "erro"
        );

        return;
    }


    if (password.length < 8) {

        mostrarMensagem(
            "A senha deve ter pelo menos 8 caracteres.",
            "erro"
        );

        return;
    }


    if (password !== confirmPassword) {

        mostrarMensagem(
            "As senhas não coincidem.",
            "erro"
        );

        return;
    }


    try {

        bloquearFormulario();


        // Cria a conta
        await cadastrarUsuario(
            username,
            email,
            password
        );


        mostrarMensagem(
            "Conta criada! Entrando...",
            "sucesso"
        );


        // Faz login automaticamente
        await fazerLogin(
            email,
            password
        );


        setTimeout(() => {

            window.location.href = "../index.html";

        }, 800);


    } catch (erro) {

        console.error(
            "Erro ao criar conta:",
            erro
        );


        mostrarMensagem(
            erro.message ||
            "Não foi possível criar sua conta.",
            "erro"
        );


    } finally {

        desbloquearFormulario();

    }

});


function bloquearFormulario() {

    registerButton.disabled = true;
    registerButton.textContent = "Criando conta...";

}


function desbloquearFormulario() {

    registerButton.disabled = false;
    registerButton.textContent = "Criar conta";

}


function mostrarMensagem(texto, tipo) {

    registerMessage.textContent = texto;


    registerMessage.classList.remove(
        "hidden",
        "form-message-error",
        "form-message-success"
    );


    if (tipo === "erro") {

        registerMessage.classList.add(
            "form-message-error"
        );

    }


    if (tipo === "sucesso") {

        registerMessage.classList.add(
            "form-message-success"
        );

    }

}


function limparMensagem() {

    registerMessage.textContent = "";


    registerMessage.classList.add(
        "hidden"
    );


    registerMessage.classList.remove(
        "form-message-error",
        "form-message-success"
    );

}