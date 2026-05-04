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

        if (senha.length < 6) {
            mostrarMensagemCadastro("warning", "A senha deve ter pelo menos 6 caracteres.");
            return;
        }

        if (senha !== confirmarSenha) {
            mostrarMensagemCadastro("danger", "As senhas não coincidem.");
            return;
        }

        const formData = new FormData();
        formData.append("nome", nome);
        formData.append("email", email);
        formData.append("senha", senha);

        fetch("backend/auth/register.php", {
            method: "POST",
            body: formData,
            credentials: "include"
        })
        .then(function (response) {
            return response.json();
        })
        .then(function (data) {
            if (data.success) {
                mostrarMensagemCadastro("success", data.message || "Cadastro realizado com sucesso.");
                registerForm.reset();
                setTimeout(function () {
                    window.location.href = "login.html";
                }, 1200);
            } else {
                mostrarMensagemCadastro("danger", data.message || "Erro ao cadastrar.");
            }
        })
        .catch(function (error) {
            console.error(error);
            mostrarMensagemCadastro("danger", "Erro ao cadastrar. Tente novamente.");
        });
    });
}
