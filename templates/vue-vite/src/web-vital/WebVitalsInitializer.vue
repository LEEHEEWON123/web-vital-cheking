<script setup lang="ts">
import { onMounted } from "vue";
import { initWebVitals } from "./lib/web-vitals";
onMounted(() => {
  setTimeout(() => initWebVitals(), 200);
});
</script>
