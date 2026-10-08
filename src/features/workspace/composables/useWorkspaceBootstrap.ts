import { onMounted } from "vue";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

/**
 * 页面挂载时从本地存储初始化工作区。
 */
export function useWorkspaceBootstrap(): void {
  const workspace = useWorkspaceStore();

  onMounted(() => {
    workspace.initialize();
  });
}
