async function importarCSV(event) {
    event.preventDefault();

    const fileInput = document.getElementById("arquivo");
    const resultado = document.getElementById("resultado");

    if (!fileInput || !resultado) {
        return;
    }

    if (!fileInput.files.length) {
        resultado.className = "alert alert-warning";
        resultado.textContent = "Selecione um arquivo CSV ou XLSX.";
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
        const avisoImagem = !data.data.coluna_imagem_detectada && (data.data.imagens_vinculadas || 0) === 0
            ? "<br><small>Nenhuma coluna foto/imagem foi detectada.</small>"
            : "";
        resultado.innerHTML = `
            <strong>Importacao concluida.</strong><br>
            Inseridos: ${data.data.produtos_inseridos}<br>
            Atualizados: ${data.data.produtos_atualizados}<br>
            Linhas com erro: ${data.data.linhas_com_erro}<br>
            Imagens vinculadas: ${data.data.imagens_vinculadas || 0}<br>
            Imagens salvas: ${data.data.imagens_salvas || 0}<br>
            Imagens ignoradas: ${data.data.imagens_ignoradas || 0}${avisoImagem}
        `;
    } catch (error) {
        console.error(error);
        resultado.className = "alert alert-danger";
        resultado.textContent = error.message || "Erro ao importar.";
    }
}

async function lerJsonSeguro(response) {
    const texto = await response.text();

    try {
        return JSON.parse(texto);
    } catch (error) {
        console.error("Resposta invalida do servidor:", texto);
        throw new Error("Resposta invalida do servidor. Verifique o arquivo e tente novamente.");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const formImportar = document.getElementById("formImportar");

    if (formImportar) {
        formImportar.addEventListener("submit", importarCSV);
    }
});
