import { onMounted, reactive, ref, watch } from "vue";
import { DEFAULT_WEBDAV_ROOT_PATH } from "@/core/constants/storage";
import type { WebDavCredentials } from "@/core/types/domain";
import {
  loadWebDavCredentials,
  saveWebDavCredentials,
} from "@/infrastructure/persistence/workspace.persistence";

/**
 * 坚果云 WebDAV 配置表单逻辑（供设置页使用）。
 */
export function useJianguoyunSyncForm() {
  /** 同步表单字段 */
  const syncForm = reactive({
    baseUrl: "https://dav.jianguoyun.com/dav",
    username: "",
    password: "",
    rootPath: DEFAULT_WEBDAV_ROOT_PATH,
  });

  /** 保存成功反馈提示文字 */
  const saveMessage = ref("");

  onMounted(() => {
    const saved = loadWebDavCredentials();
    if (saved) {
      if (saved.baseUrl) {
        syncForm.baseUrl = saved.baseUrl;
      }
      if (saved.username) {
        syncForm.username = saved.username;
      }
      if (saved.password) {
        syncForm.password = saved.password;
      }
      if (saved.rootPath) {
        syncForm.rootPath = saved.rootPath;
      }
    }
  });

  /** 组装当前表单为 {@link WebDavCredentials} */
  function getCredentials(): WebDavCredentials {
    return {
      baseUrl: syncForm.baseUrl,
      username: syncForm.username,
      password: syncForm.password,
      rootPath: syncForm.rootPath || DEFAULT_WEBDAV_ROOT_PATH,
    };
  }

  /** 持久化当前表单凭证到本地存储 */
  function persistCredentials(): void {
    saveWebDavCredentials(getCredentials());
  }

  // 监听表单输入变化，自动持久化凭证信息
  watch(syncForm, persistCredentials, { deep: true });

  /** 保存配置信息 */
  function handleSave(): void {
    persistCredentials();
    saveMessage.value = "配置已保存";
    setTimeout(() => {
      saveMessage.value = "";
    }, 2000);
  }

  return { syncForm, saveMessage, handleSave };
}
