<?php

function obterListaUsuario(PDO $pdo, int $usuarioId, bool $criar = false): ?int
{
    $stmt = $pdo->prepare("
        SELECT id_lista
        FROM lista
        WHERE fk_usuario_id_usuario = ?
        ORDER BY id_lista ASC
    ");
    $stmt->execute([$usuarioId]);
    $listas = array_map("intval", $stmt->fetchAll(PDO::FETCH_COLUMN));

    if (count($listas) > 0) {
        if (count($listas) > 1) {
            consolidarListasUsuario($pdo, $listas);
        }

        return $listas[0];
    }

    if (!$criar) {
        return null;
    }

    $stmtCriar = $pdo->prepare("
        INSERT INTO lista (nome_lista, data_criacao_lista, fk_usuario_id_usuario)
        VALUES ('Minha lista', NOW(), ?)
    ");

    try {
        $stmtCriar->execute([$usuarioId]);
        return (int) $pdo->lastInsertId();
    } catch (PDOException $erro) {
        if ($erro->getCode() !== "23000") {
            throw $erro;
        }

        $stmt->execute([$usuarioId]);
        $listaId = $stmt->fetchColumn();

        return $listaId ? (int) $listaId : null;
    }
}

function consolidarListasUsuario(PDO $pdo, array $listas): void
{
    $listaPrincipal = (int) $listas[0];
    $listasDuplicadas = array_values(array_filter(array_slice($listas, 1)));

    if (!$listaPrincipal || count($listasDuplicadas) === 0) {
        return;
    }

    $iniciouTransacao = !$pdo->inTransaction();

    if ($iniciouTransacao) {
        $pdo->beginTransaction();
    }

    try {
        $stmtItens = $pdo->prepare("
            SELECT fk_produto_id_produto, quantidade, comprado, data_adicao
            FROM lista_produto
            WHERE fk_lista_id_lista = ?
        ");
        $stmtMesclar = $pdo->prepare("
            INSERT INTO lista_produto (
                fk_lista_id_lista,
                fk_produto_id_produto,
                quantidade,
                comprado,
                data_adicao
            ) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                quantidade = quantidade + VALUES(quantidade),
                comprado = LEAST(comprado, VALUES(comprado)),
                data_adicao = LEAST(data_adicao, VALUES(data_adicao))
        ");
        $stmtRemoverItens = $pdo->prepare("DELETE FROM lista_produto WHERE fk_lista_id_lista = ?");
        $stmtRemoverLista = $pdo->prepare("DELETE FROM lista WHERE id_lista = ?");

        foreach ($listasDuplicadas as $listaDuplicada) {
            $stmtItens->execute([$listaDuplicada]);
            $itens = $stmtItens->fetchAll();

            foreach ($itens as $item) {
                $stmtMesclar->execute([
                    $listaPrincipal,
                    (int) $item["fk_produto_id_produto"],
                    max((int) $item["quantidade"], 1),
                    (int) $item["comprado"],
                    $item["data_adicao"]
                ]);
            }

            $stmtRemoverItens->execute([$listaDuplicada]);
            $stmtRemoverLista->execute([$listaDuplicada]);
        }

        if ($iniciouTransacao) {
            $pdo->commit();
        }
    } catch (Throwable $erro) {
        if ($iniciouTransacao && $pdo->inTransaction()) {
            $pdo->rollBack();
        }

        throw $erro;
    }
}
