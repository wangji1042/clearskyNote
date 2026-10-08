import { createApp } from "vue";
import { createPinia } from "pinia";
import VConsole from "vconsole";
import App from "@/app/App.vue";
import router from "@/router";
import "@/styles/global.scss";
import { isTauriMobileShell } from "@/core/utils/device";
import { IS_VITE_DEV } from "@/core/utils/vite-env";

// 开发环境启用 vConsole；Tauri 移动端（尤其 x86 模拟器）易触发 RenderThread 崩溃，故跳过
if (IS_VITE_DEV && !isTauriMobileShell()) {
  new VConsole();
}

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.mount("#app");
