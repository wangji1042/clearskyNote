<template>
  <main class="notes-page" :class="{ 'notes-page--mobile': isMobileLayout }">
    <header class="notes-page__topbar" :class="{ 'notes-page__topbar--mobile': isMobileLayout }">
      <template v-if="!isMobileLayout">
        <div class="notes-page__topbar-row">
          <div class="notes-page__brand">
            <p class="csn-eyebrow">ClearSky Note</p>
            <h1>多级目录笔记</h1>
          </div>

          <input
            v-model="workspace.searchQuery"
            class="notes-page__search csn-input csn-input--search"
            type="search"
            placeholder="搜索笔记..."
          />

          <div class="notes-page__topbar-actions">
            <button
              type="button"
              class="notes-page__sync-btn"
              :class="{ 'notes-page__sync-btn--syncing': isSyncing }"
              :disabled="isSyncing"
              :title="syncTooltip"
              aria-label="立即同步"
              @click="triggerSync"
            >
              <svg
                class="notes-page__sync-icon"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"
                />
              </svg>
            </button>

            <RouterLink
              :to="{ name: 'settings' }"
              class="notes-page__settings-link csn-btn csn-btn--ghost"
              >设置</RouterLink
            >
          </div>
        </div>
      </template>

      <template v-else>
        <div class="notes-page__mobile-head">
          <button
            id="workspace-folder-drawer-open"
            type="button"
            class="notes-page__menu-btn"
            aria-label="打开目录与菜单"
            :aria-expanded="drawerOpen"
            aria-controls="workspace-folder-drawer"
            @click="openDrawer"
          >
            <span class="notes-page__menu-icon" aria-hidden="true" />
          </button>
          <div class="notes-page__mobile-title">
            <p class="csn-eyebrow">ClearSky Note</p>
            <h1>多级目录笔记</h1>
          </div>
          <button
            type="button"
            class="notes-page__sync-btn"
            :class="{ 'notes-page__sync-btn--syncing': isSyncing }"
            :disabled="isSyncing"
            :title="syncTooltip"
            aria-label="立即同步"
            @click="triggerSync"
          >
            <svg
              class="notes-page__sync-icon"
              viewBox="0 0 24 24"
              width="24"
              height="24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path
                d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3L21.5 8M22 12.5a10 10 0 0 1-18.8 4.2L2.5 16"
              />
            </svg>
          </button>
        </div>
      </template>
    </header>

    <section v-if="!isMobileLayout" class="notes-page__grid">
      <NotesWorkspacePanels />
    </section>

    <template v-else>
      <div
        class="notes-page__drawer-backdrop"
        :class="{ 'notes-page__drawer-backdrop--open': drawerOpen }"
        aria-hidden="true"
        @click="closeDrawer"
      />

      <aside
        id="workspace-folder-drawer"
        class="notes-page__drawer"
        :class="{ 'notes-page__drawer--open': drawerOpen }"
        aria-labelledby="workspace-folder-drawer-open"
      >
        <div class="notes-page__drawer-header">
          <span class="notes-page__drawer-title">目录与菜单</span>
          <button
            type="button"
            class="notes-page__drawer-close"
            aria-label="关闭抽屉"
            @click="closeDrawer"
          >
            &times;
          </button>
        </div>

        <div class="notes-page__drawer-body">
          <div class="notes-page__drawer-search">
            <label class="notes-page__drawer-search-label" for="mobile-note-search">搜索笔记</label>
            <input
              id="mobile-note-search"
              v-model="workspace.searchQuery"
              class="notes-page__drawer-search-input csn-input csn-input--search"
              type="search"
              placeholder="搜索标题或正文…"
            />
          </div>
          <SidebarTree
            :folders="workspace.folderItems"
            :selected-folder-id="workspace.selectedFolderId"
            @select-folder="onMobileSelectFolder"
            @create-folder="workspace.createFolder()"
            @delete-folder="workspace.deleteFolder"
            @rename-folder="workspace.renameFolder"
            @import-files="onMobileImportFiles"
          />
        </div>

        <div class="notes-page__drawer-footer">
          <RouterLink
            :to="{ name: 'settings' }"
            class="notes-page__drawer-settings-btn csn-btn csn-btn--ghost"
            @click="closeDrawer"
          >
            设置
          </RouterLink>
        </div>
      </aside>

      <section class="notes-page__grid notes-page__grid--mobile-main">
        <NotesWorkspacePanels :show-sidebar="false" />
      </section>
    </template>
  </main>
</template>

<script setup lang="ts">
import { computed } from "vue";
import SidebarTree from "@/features/folders/components/SidebarTree.vue";
import NotesWorkspacePanels from "@/features/layout/components/NotesWorkspacePanels.vue";
import { useImmediateSync } from "@/features/sync/composables/useImmediateSync";
import { useMobileDrawer } from "@/features/layout/composables/useMobileDrawer";
import { useRuntimeDeviceKind } from "@/features/layout/composables/useRuntimeDeviceKind";
import { useWorkspaceBootstrap } from "@/features/workspace/composables/useWorkspaceBootstrap";
import { useWorkspaceStore } from "@/features/workspace/store/workspace.store";

const workspace = useWorkspaceStore();
const { deviceKind } = useRuntimeDeviceKind();
const { isSyncing, syncTooltip, triggerSync } = useImmediateSync();

useWorkspaceBootstrap();

/** 是否为移动端布局 */
const isMobileLayout = computed(() => deviceKind.value === "mobile");

const { drawerOpen, openDrawer, closeDrawer } = useMobileDrawer(isMobileLayout);

/** 移动端在抽屉中选目录后收起抽屉 */
function onMobileSelectFolder(folderId: string): void {
  workspace.selectFolder(folderId);
  closeDrawer();
}

/** 移动端在抽屉中导入文件后执行导入并收起抽屉 */
async function onMobileImportFiles(folderId: string, files: File[]): Promise<void> {
  await workspace.importFilesToFolder(folderId, files);
  closeDrawer();
}
</script>

<style lang="scss" src="@/pages/styles/notes-page.scss"></style>
