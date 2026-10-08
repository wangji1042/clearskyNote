<template>
  <section class="note-list csn-panel csn-panel--padded">
    <div class="csn-panel__header">
      <div>
        <p class="csn-eyebrow">列表</p>
        <h2>{{ isSearching ? `搜索: ${searchQuery}` : "当前目录" }}</h2>
      </div>
      <button type="button" class="csn-btn csn-btn--ghost" @click="$emit('create-note')">
        新建笔记
      </button>
    </div>

    <div class="note-list__cards">
      <button
        v-for="note in notes"
        :key="note.id"
        type="button"
        class="note-list__card"
        :class="{ 'note-list__card--active': note.id === selectedNoteId }"
        @click="$emit('select-note', note.id)"
      >
        <div class="note-list__card-head">
          <strong
            v-if="isSearching"
            v-html="highlightSearchHtml(note.title, searchQuery || '')"
          ></strong>
          <strong v-else>{{ note.title }}</strong>
          <span
            class="csn-icon-btn csn-icon-btn--delete"
            title="删除笔记"
            @click.stop="$emit('delete-note', note.id)"
            >&times;</span
          >
        </div>
        <p
          v-if="isSearching"
          v-html="highlightSearchHtml(note.summary || '空白笔记', searchQuery || '')"
        ></p>
        <p v-else>{{ note.summary || "空白笔记" }}</p>
        <span class="note-list__time">{{ formatShortDateTime(note.updatedAt) }}</span>
      </button>

      <div v-if="notes.length === 0" class="csn-empty">当前目录还没有笔记。</div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { NoteEntity } from "@/core/types/domain";
import { formatShortDateTime } from "@/core/utils/datetime";
import { highlightSearchHtml } from "@/core/utils/search-highlight";

defineProps<{
  notes: NoteEntity[];
  selectedNoteId: string | null;
  isSearching?: boolean;
  searchQuery?: string;
}>();

defineEmits<{
  "select-note": [noteId: string];
  "create-note": [];
  "delete-note": [noteId: string];
}>();
</script>

<style lang="scss">
@use "@/styles/variables" as v;

.note-list__cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.note-list__card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 14px;
  text-align: left;
  border-radius: 16px;
  background: v.$color-item-bg;
  color: v.$color-text-dark;
  transition:
    transform v.$transition-fast,
    background v.$transition-fast;

  &:hover {
    transform: translateY(-1px);
    background: v.$color-item-hover;

    .csn-icon-btn--delete {
      opacity: 1;
    }
  }

  &--active {
    background: linear-gradient(135deg, v.$color-accent-start, v.$color-accent-end);
    color: white;
  }

  p,
  strong {
    margin: 0;
  }

  p {
    color: inherit;
    opacity: 0.84;
    line-height: 1.5;
  }
}

.note-list__card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.note-list__time {
  font-size: 0.8rem;
  opacity: 0.7;
}

@media (hover: none) {
  .note-list__card:hover .csn-icon-btn--delete {
    opacity: 0.45;
  }
}
</style>
