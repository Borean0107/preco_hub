const STORAGE_USUARIO_LOGADO = "usuarioLogado";
const ADMIN_EMAIL = "admin@gmail.com";

const loginForm = document.getElementById("loginForm");
const mensagemLogin = document.getElementById("mensagemLogin");

function mostrarMensagemLogin(tipo, texto) {
    if (!mensagemLogin) return;

    mensagemLogin.className = "alert alert-" + tipo;
    mensagemLogin.textContent = texto;
    mensagemLogin.classList.remove("d-none");
}

function esconderMensagemLogin() {
    if (!mensagemLogin) return;

    mensagemLogin.className = "alert d-none";
    mensagemLogin.textContent = "";
}

function salvarUsuarioLogado(usuario) {
    localStorage.setItem(STORAGE_USUARIO_LOGADO, JSON.stringify(usuario));
}

function usuarioEhAdmin(usuario) {
    const emailUsuario = usuario && usuario.email ? usuario.email.toLowerCase() : "";
    return emailUsuario === ADMIN_EMAIL;
}

function redirecionarUsuarioLogado(usuario) {
    window.location.href = usuarioEhAdmin(usuario) ? "adicionar-produto.html" : "index.html";
}

fetch("backend/auth/me.php", {
    credentials: "include",
    headers: {
        "Accept": "application/json"
    }
})
.then(function (response) {
    if (!response.ok) {
        return null;
    }

    return response.json();
})
.then(function (data) {
    if (data && data.success && data.data) {
        salvarUsuarioLogado(data.data);
        redirecionarUsuarioLogado(data.data);
    }
})
.catch(function () {});

if (loginForm) {
    loginForm.addEventListener("submit", function (event) {
        event.preventDefault();

        esconderMensagemLogin();

        const emailInput = document.getElementById("email");
        const senhaInput = document.getElementById("senha");

        const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
        const senha = senhaInput ? senhaInput.value.trim() : "";

        if (!email || !senha) {
            mostrarMensagemLogin("warning", "Preencha email e senha.");
            return;
        }

        const formData = new FormData();
        formData.append("email", email);
        formData.append("senha", senha);

        fetch("backend/auth/login.php", {
            method: "POST",
            body: formData,
            credentials: "include"
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.success) {
                salvarUsuarioLogado(data.data);
                mostrarMensagemLogin("success", data.message || "Login realizado com sucesso.");
                setTimeout(function () {
                    redirecionarUsuarioLogado(data.data);
                }, 1000);
            } else {
                mostrarMensagemLogin("danger", data.message || "Email ou senha inválidos.");
            }
        })
        .catch(function (error) {
            console.error(error);
            mostrarMensagemLogin("danger", "Erro ao fazer login. Tente novamente.");
        });
    });
}
