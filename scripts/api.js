const API_URL = "http://localhost:3000";

// ==============================
// TOKEN
// ==============================

function salvarToken(token) {
    localStorage.setItem("nythra_token", token);
}

function pegarToken() {
    return localStorage.getItem("nythra_token");
}

function removerToken() {
    localStorage.removeItem("nythra_token");
}


// ==============================
// CADASTRO
// ==============================

async function cadastrarUsuario(username, email, password) {
    const resposta = await fetch(`${API_URL}/api/users`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            username,
            email,
            password
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    return dados;
}


// ==============================
// LOGIN
// ==============================

async function fazerLogin(email, password) {
    const resposta = await fetch(`${API_URL}/api/login`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            email,
            password
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    salvarToken(dados.token);

    return dados;
}


// ==============================
// USUÁRIO LOGADO
// ==============================

async function pegarUsuarioLogado() {
    const token = pegarToken();

    if (!token) {
        return null;
    }

    const resposta = await fetch(`${API_URL}/api/me`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });

    if (!resposta.ok) {
        removerToken();
        return null;
    }

    return await resposta.json();
}


// ==============================
// LISTAR FICHAS
// ==============================

async function listarFichas() {
    const resposta = await fetch(`${API_URL}/api/sheets`, {
        headers: {
            Authorization: `Bearer ${pegarToken()}`
        }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    return dados;
}


// ==============================
// BUSCAR UMA FICHA
// ==============================

async function buscarFicha(id) {
    const resposta = await fetch(`${API_URL}/api/sheets/${id}`, {
        headers: {
            Authorization: `Bearer ${pegarToken()}`
        }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    return dados;
}


// ==============================
// CRIAR FICHA
// ==============================

async function criarFicha(system, name, sheetData = {}) {
    const resposta = await fetch(`${API_URL}/api/sheets`, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pegarToken()}`
        },

        body: JSON.stringify({
            system,
            name,
            sheetData
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    return dados;
}


// ==============================
// SALVAR FICHA
// ==============================

async function salvarFicha(id, name, sheetData) {
    const resposta = await fetch(`${API_URL}/api/sheets/${id}`, {
        method: "PUT",

        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${pegarToken()}`
        },

        body: JSON.stringify({
            name,
            sheetData
        })
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    return dados;
}


// ==============================
// EXCLUIR FICHA
// ==============================

async function excluirFicha(id) {
    const resposta = await fetch(`${API_URL}/api/sheets/${id}`, {
        method: "DELETE",

        headers: {
            Authorization: `Bearer ${pegarToken()}`
        }
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.mensagem);
    }

    return dados;
}


// ==============================
// LOGOUT
// ==============================

function logout() {
    removerToken();
}