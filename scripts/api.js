const API_URL = window.NYTHRA_API_URL || "http://localhost:3000";

// TOKEN
function salvarToken(token) {
    localStorage.setItem("nythra_token", token);
}
function pegarToken() {
    return localStorage.getItem("nythra_token");
}
function removerToken() {
    localStorage.removeItem("nythra_token");
}

// Requisições da API. Os erros mantêm o status para a interface tratar 429.
async function apiRequest(path, options = {}) {
    const token = pegarToken();
    const response = await fetch(`${API_URL}/api${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers
        }
    });
    let data;
    try {
        data = await response.json();
    } catch {
        const error = new Error("O servidor retornou uma resposta inesperada. Tente novamente.");
        error.status = response.status;
        throw error;
    }
    if (!response.ok) {
        const error = new Error(data.mensagem || "Não foi possível concluir a solicitação.");
        error.status = response.status;
        const retryAfter = Number(response.headers.get("Retry-After"));
        error.retryAfter = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null;
        throw error;
    }
    return data;
}

// CADASTRO E CONFIRMAÇÃO
async function cadastrarUsuario(username, email, password) {
    return apiRequest("/users", {
        method: "POST",
        body: JSON.stringify({ username, email, password })
    });
}
async function confirmarEmail(email, code) {
    return apiRequest("/email/verify", {
        method: "POST",
        body: JSON.stringify({ email, code })
    });
}
async function reenviarCodigo(email, password) {
    return apiRequest("/email/resend", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
}

// LOGIN
async function fazerLogin(email, password) {
    const data = await apiRequest("/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
    });
    salvarToken(data.token);
    return data;
}
async function pegarUsuarioLogado() {
    if (!pegarToken()) return null;
    try {
        return await apiRequest("/me");
    } catch (error) {
        // Uma indisponibilidade de rede não encerra uma sessão válida.
        if (error.status === 401 || error.status === 403) {
            removerToken();
            return null;
        }
        throw error;
    }
}

// FICHAS — mesmas funções e parâmetros já utilizados no projeto.
async function listarFichas() {
    return apiRequest("/sheets");
}
async function buscarFicha(id) {
    return apiRequest(`/sheets/${encodeURIComponent(id)}`);
}
async function criarFicha(system, name, sheetData = {}) {
    return apiRequest("/sheets", {
        method: "POST",
        body: JSON.stringify({ system, name, sheetData })
    });
}
async function salvarFicha(id, name, sheetData) {
    return apiRequest(`/sheets/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify({ name, sheetData })
    });
}
async function excluirFicha(id) {
    return apiRequest(`/sheets/${encodeURIComponent(id)}`, { method: "DELETE" });
}
function logout() {
    removerToken();
}
