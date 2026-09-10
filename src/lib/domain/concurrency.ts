export interface VersionedEntity {
  id: string;
  version: number;
  updatedAt?: Date;
}

export interface ConcurrencyUpdateResult<T extends VersionedEntity> {
  success: boolean;
  currentData?: T;
  errorMessage?: string;
}

/**
 * Valida concorrência otimista antes de aplicar mutação.
 * Se a versão esperada enviada pelo cliente for diferente da versão atual no banco,
 * rejeita com erro de conflito e retorna a versão mais recente do registro.
 */
export function validateOptimisticConcurrency<T extends VersionedEntity>(
  currentServerEntity: T,
  expectedClientVersion: number
): ConcurrencyUpdateResult<T> {
  if (currentServerEntity.version !== expectedClientVersion) {
    return {
      success: false,
      currentData: currentServerEntity,
      errorMessage: `Conflito de edição simultânea: o registro foi alterado por outro usuário (versão atual no servidor: v${currentServerEntity.version}, versão editada por você: v${expectedClientVersion}). Suas alterações foram preservadas para revisão.`,
    };
  }

  return {
    success: true,
  };
}

/**
 * Lança erro se houver conflito de concorrência otimista.
 */
export function checkOptimisticLock(
  currentVersion: number,
  expectedVersion: number,
  entityName: string = "Entidade"
): void {
  if (currentVersion !== expectedVersion) {
    throw new Error(
      `Conflito de concorrência: ${entityName} foi alterado por outro usuário (versão atual v${currentVersion} vs versão enviada v${expectedVersion}).`
    );
  }
}
