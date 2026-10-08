import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
/** 项目根目录 */
const projectRoot = join(__dirname, "..");
/** Tauri 生成的 Android app 模块 Gradle 文件 */
const buildGradlePath = join(projectRoot, "src-tauri/gen/android/app/build.gradle.kts");
/** 签名材料目录（位于 gen/ 外，避免 android:init 覆盖） */
const androidSigningDir = join(projectRoot, "src-tauri/android");
/** 用于检测是否已注入签名配置 */
const SIGNING_MARKER = "signingConfigs {";

/**
 * 向 build.gradle.kts 注入 release 签名配置（幂等）。
 */
function patchBuildGradle() {
  if (!existsSync(buildGradlePath)) {
    console.error("[android:signing:setup] 未找到 gen/android，请先执行 npm run android:init");
    process.exit(1);
  }

  let content = readFileSync(buildGradlePath, "utf8");
  if (content.includes(SIGNING_MARKER)) {
    console.log("[android:signing:setup] 签名配置已存在，跳过");
    return;
  }

  if (!content.includes("import java.io.FileInputStream")) {
    content = content.replace(
      "import java.util.Properties",
      "import java.io.FileInputStream\nimport java.util.Properties",
    );
  }

  const signingBlock = `
    signingConfigs {
        create("release") {
            val keystorePropertiesFile = rootProject.file("../../android/keystore.properties")
            val keystoreProperties = Properties()
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(FileInputStream(keystorePropertiesFile))
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["password"] as String
                storeFile = rootProject.file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["password"] as String
            }
        }
    }
    buildTypes {`;

  content = content.replace("\n    buildTypes {", signingBlock);

  content = content.replace(
    '        getByName("release") {',
    `        getByName("release") {
            val keystorePropertiesFile = rootProject.file("../../android/keystore.properties")
            if (keystorePropertiesFile.exists()) {
                signingConfig = signingConfigs.getByName("release")
            }`,
  );

  writeFileSync(buildGradlePath, content, "utf8");
  console.log("[android:signing:setup] 已写入 Gradle release 签名配置");
}

/**
 * 检查 keystore.properties 是否已创建。
 */
function remindKeystoreProperties() {
  const propsPath = join(androidSigningDir, "keystore.properties");
  if (existsSync(propsPath)) {
    return;
  }

  console.warn(
    "[android:signing:setup] 尚未创建 src-tauri/android/keystore.properties，release APK 仍会未签名。",
  );
  console.warn(
    "[android:signing:setup] 本地试装可用 npm run android:build:debug；正式发布请按 keystore.properties.example 配置。",
  );
}

patchBuildGradle();
remindKeystoreProperties();
