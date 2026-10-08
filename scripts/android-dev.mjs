import { execSync, spawn } from "node:child_process";

/** 开发服务器端口（与 vite.config.ts、tauri.conf.json 一致） */
const DEV_PORT = 1420;

/** 模拟器内 127.0.0.1 需 adb reverse 才能访问本机 Vite 的端口 */
const ADB_REVERSE_PORTS = [DEV_PORT];

/**
 * 为已连接的 Android 设备/模拟器建立端口转发，使设备内 127.0.0.1 指向本机。
 * @returns {boolean} 是否至少有一个端口转发成功
 */
function setupAdbReverse() {
  let anySuccess = false;
  for (const port of ADB_REVERSE_PORTS) {
    try {
      execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: "pipe" });
      console.log(`[android:dev] adb reverse tcp:${port} tcp:${port} ok`);
      anySuccess = true;
    } catch {
      console.warn(
        `[android:dev] adb reverse tcp:${port} 暂未就绪（模拟器启动后会自动重试）。`,
      );
    }
  }
  return anySuccess;
}

setupAdbReverse();

/** Tauri 拉起模拟器后补做 reverse（启动脚本执行时设备往往尚未连接） */
const reverseTimer = setInterval(() => {
  setupAdbReverse();
}, 4000);

const child = spawn("npx", ["tauri", "android", "dev", "--host", "127.0.0.1"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

child.on("exit", (code) => {
  clearInterval(reverseTimer);
  process.exit(code ?? 1);
});
