import { createRouter, createWebHashHistory } from "vue-router";
import NotesPage from "@/pages/NotesPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: "/",
      name: "notes",
      component: NotesPage,
    },
    {
      path: "/settings",
      name: "settings",
      component: SettingsPage,
    },
  ],
});

export default router;
