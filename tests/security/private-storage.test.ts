import { describe, it, expect } from "vitest";
import { StorageService } from "../../src/lib/storage/storage-service";
import crypto from "crypto";

describe("Armazenamento Seguro de Anexos Privados (Critério 16)", () => {
  const service = new StorageService();

  it("[Critério 16] Deve rejeitar upload de arquivo executável (.exe)", async () => {
    const fakeExe = Buffer.from("MZ fake executable header");

    await expect(
      service.uploadFile({
        fileName: "malicious.exe",
        mimeType: "application/octet-stream",
        fileBuffer: fakeExe,
        userId: "user_1",
        projectId: "proj_1",
      })
    ).rejects.toThrow("não é permitida por motivos de segurança");
  });

  it("[Critério 16] Deve rejeitar upload de arquivo que exceda 20 MB", async () => {
    const oversizedBuffer = Buffer.alloc(21 * 1024 * 1024); // 21 MB

    await expect(
      service.uploadFile({
        fileName: "large_document.pdf",
        mimeType: "application/pdf",
        fileBuffer: oversizedBuffer,
        userId: "user_1",
        projectId: "proj_1",
      })
    ).rejects.toThrow("excede o limite máximo permitido de 20 MB");
  });

  it("[Critério 16] Deve aceitar PDF válido, gerar hash SHA-256 e permitir recuperação íntegra do buffer", async () => {
    const pdfContent = Buffer.from("%PDF-1.4 Relatório de Homologação de Dados Legados Centi");
    const expectedHash = crypto.createHash("sha256").update(pdfContent).digest("hex");

    const result = await service.uploadFile({
      fileName: "Relatorio_Homologacao.pdf",
      mimeType: "application/pdf",
      fileBuffer: pdfContent,
      userId: "user_1",
      projectId: "proj_1",
    });

    expect(result.sha256Hash).toBe(expectedHash);
    expect(result.fileName).toBe("Relatorio_Homologacao.pdf");
    expect(result.fileSize).toBe(pdfContent.length);

    // Recuperação autorizada
    const retrieved = await service.getFileBuffer(result.storagePath);
    expect(retrieved).toEqual(pdfContent);
  });
});
