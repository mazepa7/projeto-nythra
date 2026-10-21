const verificationToken = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname);
const verificationMessage = document.querySelector('#verification-message');
const verifyButton = document.querySelector('#verify-button');
if (!verificationToken) { verificationMessage.textContent = 'Link inválido. Solicite um reenvio.'; verifyButton.disabled = true; }
verifyButton.addEventListener('click', async () => {
    verifyButton.disabled = true;
    try {
        const result = await apiRequest('/email/verify', { method: 'POST', body: JSON.stringify({ token: verificationToken }) });
        verificationMessage.textContent = result.mensagem;
        verifyButton.hidden = true;
    } catch (error) { verificationMessage.textContent = error.message; verifyButton.disabled = false; }
});
