(() => {
    const $ = selector => document.querySelector(selector);
    const registerForm = $("#register-form");
    const registerButton = $("#register-button");
    const registerMessage = $("#register-message");
    const verificationForm = $("#verification-form");
    const verificationMessage = $("#verification-message");
    const verificationEmail = $("#verification-email");
    const codeInput = $("#verification-code");
    const verifyButton = $("#verify-button");
    const resendButton = $("#resend-code-button");
    const resendPasswordField = $("#resend-password-field");
    const resendPassword = $("#resend-password");
    const storageKey = "nythra_pending_email_confirmation";

    // A senha fica apenas na memória desta página para autorizar o reenvio.
    // Não é salva em localStorage, sessionStorage ou na URL.
    let pendingPassword = "";
    let passwordEmail = "";
    let cooldownEmail = "";
    let cooldownUntil = 0;
    let busy = false;
    let registrationBusy = false;
    let confirmed = false;
    let cooldownTimer = null;

    const normalizedEmail = () => verificationEmail.value.trim().toLowerCase();

    function message(element, text, error = false) {
        element.textContent = text;
        element.hidden = !text;
        element.classList.toggle("form-message-error", error);
        element.classList.toggle("form-message-success", Boolean(text) && !error);
    }
    function networkMessage(error) {
        return error instanceof TypeError
            ? "Não foi possível conectar ao servidor. Confira se ele está rodando e tente novamente."
            : error.message || "Não foi possível concluir a solicitação.";
    }
    function savePending() {
        try {
            sessionStorage.setItem(storageKey, JSON.stringify({
                email: normalizedEmail(), cooldownEmail, cooldownUntil
            }));
        } catch { /* O fluxo também funciona com armazenamento indisponível. */ }
    }
    function clearPending() {
        try { sessionStorage.removeItem(storageKey); } catch { /* Sem armazenamento. */ }
    }
    function remainingSeconds() {
        return normalizedEmail() === cooldownEmail
            ? Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000))
            : 0;
    }
    function renderControls() {
        const remaining = remainingSeconds();
        verifyButton.disabled = busy || confirmed;
        verificationEmail.readOnly = busy || confirmed;
        codeInput.readOnly = busy || confirmed;
        resendPassword.disabled = busy || confirmed;
        $("#back-to-register-button").disabled = busy || confirmed;
        resendButton.disabled = busy || confirmed || remaining > 0;
        resendButton.textContent = busy && resendButton.dataset.sending === "true"
            ? "Enviando..."
            : remaining > 0 ? `Reenviar em ${remaining}s` : "Reenviar código";
        $("#resend-status").textContent = remaining > 0
            ? "Aguarde o intervalo antes de solicitar outro código."
            : "Ao reenviar, o código anterior deixa de funcionar.";
    }
    function startCooldown(seconds = 60) {
        cooldownEmail = normalizedEmail();
        cooldownUntil = Date.now() + seconds * 1000;
        savePending();
        renderControls();
    }
    function openVerification(email, text = "", error = false) {
        $("#registration-step").hidden = true;
        $("#verification-step").hidden = false;
        $("#verification-success").hidden = true;
        $("#register-eyebrow").textContent = "Só falta confirmar";
        $("#register-title").textContent = "Confirme seu e-mail";
        $("#register-description").textContent = "Digite o código recebido para concluir seu cadastro.";
        verificationEmail.value = email.trim().toLowerCase();
        codeInput.value = "";
        message(verificationMessage, text, error);
        savePending();
        renderControls();
        if (cooldownTimer === null) cooldownTimer = setInterval(renderControls, 1000);
        (verificationEmail.value ? codeInput : verificationEmail).focus();
    }

    registerForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (registrationBusy) return;
        message(registerMessage, "");
        const username = $("#username").value.trim();
        const email = $("#email").value.trim().toLowerCase();
        const password = $("#password").value;
        const confirmation = $("#confirm-password").value;
        if (!registerForm.reportValidity()) return;
        if (username.length < 3 || username.length > 30) {
            message(registerMessage, "O nome de usuário deve ter entre 3 e 30 caracteres.", true);
            return;
        }
        if (password.length < 8) {
            message(registerMessage, "A senha deve ter pelo menos 8 caracteres.", true);
            return;
        }
        if (password !== confirmation) {
            message(registerMessage, "As senhas não coincidem.", true);
            return;
        }
        registrationBusy = true;
        registerButton.disabled = true;
        registerButton.textContent = "Criando conta...";
        $("#open-verification-button").disabled = true;
        try {
            const result = await cadastrarUsuario(username, email, password);
            pendingPassword = password;
            passwordEmail = email;
            $("#password").value = "";
            $("#confirm-password").value = "";
            openVerification(email,
                result.emailSent
                    ? "Enviamos seu código. Confira sua caixa de entrada e o spam."
                    : "Sua conta foi criada, mas o envio falhou. Use Reenviar código para tentar novamente.",
                !result.emailSent);
            if (result.emailSent) startCooldown();
        } catch (error) {
            message(registerMessage, networkMessage(error), true);
        } finally {
            registrationBusy = false;
            registerButton.disabled = false;
            registerButton.textContent = "Criar conta";
            $("#open-verification-button").disabled = false;
        }
    });

    verificationForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (busy || confirmed) return;
        if (!verificationForm.reportValidity()) return;
        const email = normalizedEmail();
        const code = codeInput.value.trim();
        if (!/^[0-9]{6}$/.test(code)) {
            message(verificationMessage, "Digite os 6 dígitos do código recebido.", true);
            codeInput.focus();
            return;
        }
        busy = true;
        verifyButton.textContent = "Confirmando...";
        message(verificationMessage, "");
        renderControls();
        try {
            await confirmarEmail(email, code);
            confirmed = true;
            pendingPassword = "";
            passwordEmail = "";
            resendPassword.value = "";
            clearPending();
            clearInterval(cooldownTimer);
            cooldownTimer = null;
            $("#verification-step").hidden = true;
            $("#verification-success").hidden = false;
            $("#signup-prompt").hidden = true;
            $("#register-eyebrow").textContent = "Tudo pronto";
            $("#register-title").textContent = "Cadastro confirmado";
            $("#register-description").textContent = "Sua próxima aventura já pode começar.";
            $("#register-title").focus();
            setTimeout(() => window.location.assign("./login.html"), 1600);
        } catch (error) {
            message(verificationMessage, networkMessage(error), true);
            codeInput.focus();
            codeInput.select();
        } finally {
            busy = false;
            verifyButton.textContent = "Confirmar cadastro";
            renderControls();
        }
    });

    resendButton.addEventListener("click", async () => {
        if (busy || confirmed || remainingSeconds() > 0) return;
        if (!verificationEmail.reportValidity()) return;
        const email = normalizedEmail();
        const password = email === passwordEmail && pendingPassword
            ? pendingPassword : resendPassword.value;
        if (!password) {
            resendPasswordField.hidden = false;
            message(verificationMessage, "Digite a senha da sua conta Nythra abaixo e clique novamente em Reenviar código.", true);
            resendPassword.focus();
            return;
        }
        busy = true;
        resendButton.dataset.sending = "true";
        renderControls();
        message(verificationMessage, "");
        try {
            const result = await reenviarCodigo(email, password);
            pendingPassword = password;
            passwordEmail = email;
            resendPassword.value = "";
            resendPasswordField.hidden = true;
            codeInput.value = "";
            startCooldown();
            message(verificationMessage, result.mensagem || "Novo código enviado. Confira seu e-mail.");
            codeInput.focus();
        } catch (error) {
            if (error.status === 429) startCooldown(error.retryAfter || 60);
            // Permite corrigir a senha após uma resposta de credenciais inválidas.
            if (error.status === 401) {
                pendingPassword = "";
                passwordEmail = "";
                resendPassword.value = "";
                resendPasswordField.hidden = false;
                resendPassword.focus();
            }
            message(verificationMessage, networkMessage(error), true);
        } finally {
            busy = false;
            resendButton.dataset.sending = "false";
            renderControls();
            if (!resendPasswordField.hidden) resendPassword.focus();
        }
    });

    // Código é texto, preservando zeros iniciais. Aceita também colar "123 456".
    codeInput.addEventListener("paste", event => {
        const pasted = event.clipboardData?.getData("text");
        if (typeof pasted !== "string") return;
        event.preventDefault();
        codeInput.value = pasted.replace(/[^0-9]/g, "").slice(0, 6);
    });
    codeInput.addEventListener("input", () => {
        codeInput.value = codeInput.value.replace(/[^0-9]/g, "").slice(0, 6);
    });
    verificationEmail.addEventListener("input", () => {
        pendingPassword = "";
        passwordEmail = "";
        resendPassword.value = "";
        codeInput.value = "";
        message(verificationMessage, "");
        savePending();
        renderControls();
    });
    $("#open-verification-button").addEventListener("click", () => {
        openVerification($("#email").value,
            "Se já recebeu um código, digite-o aqui. Caso precise de outro, use Reenviar código.");
    });
    $("#back-to-register-button").addEventListener("click", () => {
        if (busy) return;
        pendingPassword = "";
        passwordEmail = "";
        resendPassword.value = "";
        resendPasswordField.hidden = true;
        clearPending();
        clearInterval(cooldownTimer);
        cooldownTimer = null;
        $("#verification-step").hidden = true;
        $("#registration-step").hidden = false;
        $("#register-eyebrow").textContent = "Comece agora";
        $("#register-title").textContent = "Criar sua conta";
        $("#register-description").textContent = "Sua próxima aventura começa aqui.";
        message(registerMessage, "A conta anterior continua pendente. Para confirmá-la, use Já tenho uma conta para confirmar.");
        $("#register-title").focus();
    });

    // Após recarregar, recupera somente o e-mail e a espera; pede senha se houver reenvio.
    try {
        const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
        if (saved && typeof saved.email === "string" && saved.email) {
            cooldownEmail = typeof saved.cooldownEmail === "string" ? saved.cooldownEmail : "";
            cooldownUntil = Number.isFinite(saved.cooldownUntil) ? saved.cooldownUntil : 0;
            openVerification(saved.email,
                "Conclua a confirmação com o código recebido. Para reenviar, será necessário informar sua senha.");
        }
    } catch { clearPending(); }
})();
