import fs from "fs";
import path from "path";
import crypto from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface UploadOptions {
  fileName: string;
  mimeType: string;
  fileBuffer: Buffer;
  userId: string;
  projectId: string;
}

export interface UploadResult {
  fileName: string;
  fileSize: number;
  mimeType: string;
  sha256Hash: string;
  storagePath: string;
  driver: "local" | "s3";
}

const ALLOWED_EXTENSIONS = new Set([
  ".pdf",
  ".docx",
  ".xlsx",
  ".csv",
  ".txt",
  ".png",
  ".jpg",
  ".jpeg",
]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

export class StorageService {
  private driver: "local" | "s3";
  private localDir: string;
  private s3Client?: S3Client;
  private s3Bucket?: string;

  constructor() {
    this.driver = (process.env.STORAGE_DRIVER as "local" | "s3") || "local";
    this.localDir = path.resolve(process.env.LOCAL_STORAGE_DIR || "./data/storage");

    if (this.driver === "local") {
      if (!fs.existsSync(this.localDir)) {
        fs.mkdirSync(this.localDir, { recursive: true });
      }
    } else {
      this.s3Bucket = process.env.S3_BUCKET || "documentos-centi";
      this.s3Client = new S3Client({
        region: process.env.S3_REGION || "us-east-1",
        endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
          secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
        },
      });
    }
  }

  public getActiveDriver(): "local" | "s3" {
    return this.driver;
  }

  /**
   * Valida e armazena o arquivo de forma segura
   */
  public async uploadFile(options: UploadOptions): Promise<UploadResult> {
    const { fileName, mimeType, fileBuffer, projectId } = options;

    // 1. Validação de Tamanho
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new Error(`Arquivo excede o limite máximo permitido de 20 MB (${fileBuffer.length} bytes).`);
    }

    if (fileBuffer.length === 0) {
      throw new Error("Arquivo vazio não é permitido.");
    }

    // 2. Validação de Extensão
    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new Error(`Extensão de arquivo '${ext}' não é permitida por motivos de segurança.`);
    }

    // 3. Validação de MIME Type
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new Error(`Tipo de conteúdo '${mimeType}' não é permitido.`);
    }

    // 4. Cálculo do Hash SHA-256 para integridade
    const hash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // 5. Nome Seguro e Armazenamento
    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueKey = `${projectId}/${Date.now()}_${sanitizedBase}_${hash.slice(0, 8)}${ext}`;

    if (this.driver === "local") {
      const fullPath = path.join(this.localDir, uniqueKey);
      const parentDir = path.dirname(fullPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.writeFileSync(fullPath, fileBuffer);

      return {
        fileName,
        fileSize: fileBuffer.length,
        mimeType,
        sha256Hash: hash,
        storagePath: uniqueKey,
        driver: "local",
      };
    } else {
      if (!this.s3Client || !this.s3Bucket) {
        throw new Error("Cliente S3 não configurado.");
      }

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: uniqueKey,
          Body: fileBuffer,
          ContentType: mimeType,
          Metadata: {
            sha256: hash,
            originalName: fileName,
          },
        })
      );

      return {
        fileName,
        fileSize: fileBuffer.length,
        mimeType,
        sha256Hash: hash,
        storagePath: uniqueKey,
        driver: "s3",
      };
    }
  }

  /**
   * Obtém os bytes do arquivo para download autorizado
   */
  public async getFileBuffer(storagePath: string): Promise<Buffer> {
    if (this.driver === "local") {
      const fullPath = path.join(this.localDir, storagePath);
      // Previne Directory Traversal
      if (!fullPath.startsWith(this.localDir)) {
        throw new Error("Acesso a caminho de arquivo não autorizado.");
      }
      if (!fs.existsSync(fullPath)) {
        throw new Error("Arquivo não encontrado no armazenamento local.");
      }
      return fs.readFileSync(fullPath);
    } else {
      if (!this.s3Client || !this.s3Bucket) {
        throw new Error("Cliente S3 não configurado.");
      }

      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: storagePath,
        })
      );

      const byteArray = await response.Body?.transformToByteArray();
      if (!byteArray) {
        throw new Error("Falha ao recuperar arquivo do S3.");
      }
      return Buffer.from(byteArray);
    }
  }
}

export const storageService = new StorageService();
