const STORAGE_USUARIOS = "usuarios";
const STORAGE_USUARIO_LOGADO = "usuarioLogado";

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

function lerUsuarios() {
    const dados = localStorage.getItem(STORAGE_USUARIOS);
    return dados ? JSON.parse(dados) : [];
}

function salvarUsuarioLogado(usuario) {
    localStorage.setItem(STORAGE_USUARIO_LOGADO, JSON.stringify(usuario));
}

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

        const usuarios = lerUsuarios();

        const usuario = usuarios.find(function (item) {
            return item.email.toLowerCase() === email && item.senha === senha;
        });

        if (!usuario) {
            mostrarMensagemLogin("danger", "Email ou senha inválidos.");
            return;
        }

        salvarUsuarioLogado({
            id: usuario.id,
            nome: usuario.nome,
            email: usuario.email
        });

        mostrarMensagemLogin("success", "Login realizado com sucesso.");

        setTimeout(function () {
            window.location.href = "index.html";
        }, 1000);
    });
}