import { onBeforeUnmount, onMounted, ref, watch, type Ref } from "vue";

/**
 * 移动端左侧目录抽屉：开关、Escape、body 滚动锁。
 *
 * @param isMobileLayout 是否为移动布局
 */
export function useMobileDrawer(isMobileLayout: Ref<boolean>) {
  /** 抽屉是否打开 */
  const drawerOpen = ref(false);

  /** 打开抽屉 */
  function openDrawer(): void {
    drawerOpen.value = true;
  }

  /** 关闭抽屉 */
  function closeDrawer(): void {
    drawerOpen.value = false;
  }

  /** Escape 关闭抽屉 */
  function onEscapeKey(event: KeyboardEvent): void {
    if (event.key === "Escape" && drawerOpen.value) {
      closeDrawer();
    }
  }

  watch(drawerOpen, (open) => {
    if (typeof document === "undefined") {
      return;
    }
    document.body.style.overflow = open ? "hidden" : "";
  });

  watch(isMobileLayout, (mobile) => {
    if (!mobile) {
      closeDrawer();
    }
  });

  onMounted(() => {
    window.addEventListener("keydown", onEscapeKey);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("keydown", onEscapeKey);
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
    }
  });

  return { drawerOpen, openDrawer, closeDrawer };
}
