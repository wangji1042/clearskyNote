import type { WebDavCredentials, WorkspaceSnapshot } from "@/core/types/domain";
import { STORAGE_KEY_CREDENTIALS, STORAGE_KEY_WORKSPACE } from "@/core/constants/storage";
import { decryptSecret, encryptSecret } from "@/core/utils/secret";
import { readText, writeText } from "@/infrastructure/persistence/local-kv";

/** 从本地加载工作区快照 */
export function loadWorkspaceSnapshot(): WorkspaceSnapshot | null {
  const raw = readText(STORAGE_KEY_WORKSPACE);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as WorkspaceSnapshot;
  } catch {
    return null;
  }
}

/** 持久化工作区快照 */
export function saveWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  writeText(STORAGE_KEY_WORKSPACE, JSON.stringify(snapshot));
}

/** 加载已保存的 WebDAV 凭证（密码自动解密） */
export function loadWebDavCredentials(): Partial<WebDavCredentials> | null {
  const raw = readText(STORAGE_KEY_CREDENTIALS);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<WebDavCredentials>;
    if (parsed && typeof parsed.password === "string") {
      parsed.password = decryptSecret(parsed.password);
    }
    return parsed;
  } catch {
    return null;
  }
}

/** 保存 WebDAV 凭证（包含地址、用户名、加密密码与根目录） */
export function saveWebDavCredentials(credentials: Partial<WebDavCredentials>): void {
  /** 本地加密后的密码密文 */
  const encryptedPassword = credentials.password
    ? encryptSecret(credentials.password)
    : credentials.password;

  writeText(
    STORAGE_KEY_CREDENTIALS,
    JSON.stringify({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      password: encryptedPassword,
      rootPath: credentials.rootPath,
    }),
  );
}
