<template>
  <main class="settings-page">
    <header class="settings-page__header">
      <RouterLink :to="{ name: 'notes' }" class="settings-page__back csn-btn csn-btn--ghost"
        >← 返回笔记</RouterLink
      >
      <div class="settings-page__header-text">
        <p class="csn-eyebrow">ClearSky Note</p>
        <h1 class="settings-page__title">设置</h1>
      </div>
    </header>

    <section class="settings-page__card">
      <h2 class="settings-page__section-title">坚果云 WebDAV 同步</h2>
      <p class="settings-page__hint">
        WebDAV 地址、用户名、应用专用密码和应用根目录将保存在本地，方便下次自动填入。
      </p>
      <p v-if="webDavEmulatorHint" class="settings-page__hint">{{ webDavEmulatorHint }}</p>

      <form class="settings-page__form" @submit.prevent="handleSave">
        <input
          v-model.trim="syncForm.baseUrl"
          class="settings-page__input csn-input"
          placeholder="坚果云 WebDAV 地址"
        />
        <input
          v-model.trim="syncForm.username"
          class="settings-page__input csn-input"
          placeholder="用户名"
        />
        <input
          v-model.trim="syncForm.password"
          class="settings-page__input csn-input"
          type="password"
          placeholder="应用专用密码"
        />
        <input
          v-model.trim="syncForm.rootPath"
          class="settings-page__input csn-input"
          placeholder="应用根目录"
        />
        <button class="csn-btn csn-btn--primary" type="submit">保存</button>
      </form>

      <p v-if="saveMessage" class="csn-sync-success">{{ saveMessage }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { isLikelyAndroidEmulator } from "@/core/utils/device";
import { useJianguoyunSyncForm } from "@/features/sync/composables/useJianguoyunSyncForm";
import { useWorkspaceBootstrap } from "@/features/workspace/composables/useWorkspaceBootstrap";

useWorkspaceBootstrap();

/** 模拟器无法访问公网时的 WebDAV 提示 */
const webDavEmulatorHint = isLikelyAndroidEmulator()
  ? "当前为 Android 模拟器：若无法访问外网，坚果云同步会失败，请改用真机或修复模拟器网络。"
  : "";

const { syncForm, saveMessage, handleSave } = useJianguoyunSyncForm();
</script>

<style lang="scss" src="@/pages/styles/settings-page.scss"></style>
