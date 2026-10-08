import { onBeforeUnmount, onMounted, ref } from "vue";
import { getRuntimeDeviceKind } from "@/core/utils/device";

/**
 * 响应式设备归类（桌面 / 移动），随窗口与指针类型更新。
 */
export function useRuntimeDeviceKind() {
  /** 当前设备归类 */
  const deviceKind = ref<ReturnType<typeof getRuntimeDeviceKind>>(getRuntimeDeviceKind());

  /** `(pointer: coarse)` 媒体查询实例 */
  let mqCoarse: MediaQueryList | undefined;

  /** 刷新 {@link deviceKind} */
  function refreshDeviceKind(): void {
    deviceKind.value = getRuntimeDeviceKind();
  }

  onMounted(() => {
    refreshDeviceKind();
    window.addEventListener("resize", refreshDeviceKind);
    mqCoarse = window.matchMedia("(pointer: coarse)");
    mqCoarse.addEventListener("change", refreshDeviceKind);
  });

  onBeforeUnmount(() => {
    window.removeEventListener("resize", refreshDeviceKind);
    if (mqCoarse) {
      mqCoarse.removeEventListener("change", refreshDeviceKind);
    }
  });

  return { deviceKind, refreshDeviceKind };
}
