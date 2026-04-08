const STORAGE_USUARIOS = "usuarios";

const registerForm = document.getElementById("registerForm");
const mensagemCadastro = document.getElementById("mensagemCadastro");

function mostrarMensagemCadastro(tipo, texto) {
    if (!mensagemCadastro) return;

    mensagemCadastro.className = "alert alert-" + tipo;
    mensagemCadastro.textContent = texto;
    mensagemCadastro.classList.remove("d-none");
}

function esconderMensagemCadastro() {
    if (!mensagemCadastro) return;

    mensagemCadastro.className = "alert d-none";
    mensagemCadastro.textContent = "";
}

function lerUsuarios() {
    const dados = localStorage.getItem(STORAGE_USUARIOS);
    return dados ? JSON.parse(dados) : [];
}

function salvarUsuarios(usuarios) {
    localStorage.setItem(STORAGE_USUARIOS, JSON.stringify(usuarios));
}

function emailValido(email) {
    return /\S+@\S+\.\S+/.test(email);
}

if (registerForm) {
    registerForm.addEventListener("submit", function (event) {
        event.preventDefault();

        esconderMensagemCadastro();

        const nomeInput = document.getElementById("nome");
        const emailInput = document.getElementById("email");
        const senhaInput = document.getElementById("senha");
        const confirmarSenhaInput = document.getElementById("confirmarSenha");

        const nome = nomeInput ? nomeInput.value.trim() : "";
        const email = emailInput ? emailInput.value.trim().toLowerCase() : "";
        const senha = senhaInput ? senhaInput.value.trim() : "";
        const confirmarSenha = confirmarSenhaInput ? confirmarSenhaInput.value.trim() : "";

        if (!nome || !email || !senha || !confirmarSenha) {
            mostrarMensagemCadastro("warning", "Preencha todos os campos.");
            return;
        }

        if (!emailValido(email)) {
            mostrarMensagemCadastro("warning", "Digite um email válido.");
            return;
        }

        if (senha.length < 4) {
            mostrarMensagemCadastro("warning", "A senha deve ter pelo menos 4 caracteres.");
            return;
        }

        if (senha !== confirmarSenha) {
            mostrarMensagemCadastro("danger", "As senhas não coincidem.");
            return;
        }

        const usuarios = lerUsuarios();

        const emailJaExiste = usuarios.some(function (usuario) {
            return usuario.email.toLowerCase() === email;
        });

        if (emailJaExiste) {
            mostrarMensagemCadastro("danger", "Este email já está cadastrado.");
            return;
        }

        usuarios.push({
            id: Date.now(),
            nome: nome,
            email: email,
            senha: senha
        });

        salvarUsuarios(usuarios);

        mostrarMensagemCadastro("success", "Cadastro realizado com sucesso.");

        registerForm.reset();

        setTimeout(function () {
            window.location.href = "login.html";
        }, 1200);
    });
}