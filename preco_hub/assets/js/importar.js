async function importarCSV(event) {
    event.preventDefault();

    const fileInput = document.getElementById("arquivo");
    const resultado = document.getElementById("resultado");

    if (!fileInput || !resultado) {
        return;
    }

    if (!fileInput.files.length) {
        resultado.className = "alert alert-warning";
        resultado.textContent = "Selecione um arquivo CSV.";
        return;
    }

    const formData = new FormData();
    formData.append("arquivo", fileInput.files[0]);

    resultado.className = "alert alert-info";
    resultado.textContent = "Processando planilha...";

    try {
        const response = await fetch("backend/importar/importar.php", {
            method: "POST",
            body: formData
        });

        const data = await lerJsonSeguro(response);

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Erro ao importar.");
        }

        resultado.className = "alert alert-success";
        resultado.innerHTML = `
            <strong>Importacao concluida.</strong><br>
            Inseridos: ${data.data.produtos_inseridos}<br>
            Atualizados: ${data.data.produtos_atualizados}<br>
            Linhas com erro: ${data.data.linhas_com_erro}
        `;
    } catch (error) {
        console.error(error);
        resultado.className = "alert alert-danger";
        resultado.textContent = error.message || "Erro ao importar.";
    }
}

async function lerJsonSeguro(response) {
    const texto = await response.text();
    const inicioJson = texto.indexOf("{");

    if (inicioJson === -1) {
        throw new Error("Resposta invalida do servidor.");
    }

    return JSON.parse(texto.slice(inicioJson));
}

document.addEventListener("DOMContentLoaded", function () {
    const formImportar = document.getElementById("formImportar");

    if (formImportar) {
        formImportar.addEventListener("submit", importarCSV);
    }
});
