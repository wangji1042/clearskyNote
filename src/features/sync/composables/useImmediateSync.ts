import { computed } from "vue";
import { useRouter } from "vue-router";
import { DEFAULT_WEBDAV_ROOT_PATH } from "@/core/constants/storage";
import { loadWebDavCredentials } from "@/infrastructure/persistence/workspace.persistence";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

/**
 * 主界面立即同步逻辑
 */
export function useImmediateSync() {
  const workspace = useWorkspaceStore();
  const router = useRouter();

  /** 当前是否正在同步中 */
  const isSyncing = computed(() => workspace.syncState === "syncing");

  /** 同步按钮悬浮提示 */
  const syncTooltip = computed(() => {
    if (workspace.syncState === "syncing") {
      return "正在同步...";
    }
    if (workspace.syncState === "success") {
      return "同步完成（点击可再次同步）";
    }
    if (workspace.syncState === "error" && workspace.syncError) {
      return `同步失败：${workspace.syncError}`;
    }
    return "立即同步";
  });

  /** 触发立即双向同步 */
  async function triggerSync(): Promise<void> {
    if (workspace.syncState === "syncing") {
      return;
    }

    const credentials = loadWebDavCredentials();
    if (!credentials?.baseUrl || !credentials?.username || !credentials?.password) {
      alert("请先在设置中配置坚果云 WebDAV 地址、用户名和应用专用密码。");
      await router.push({ name: "settings" });
      return;
    }

    await workspace.syncWithWebDav({
      baseUrl: credentials.baseUrl,
      username: credentials.username,
      password: credentials.password,
      rootPath: credentials.rootPath || DEFAULT_WEBDAV_ROOT_PATH,
    });

    if (workspace.syncError) {
      alert(`同步失败：${workspace.syncError}`);
    }
  }

  return {
    isSyncing,
    syncTooltip,
    triggerSync,
  };
}
