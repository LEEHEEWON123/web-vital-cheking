<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

type DeviceType = "mobile" | "tablet" | "desktop";
interface AppDomain { domain: string; folder: string; routes: string[]; autoTracked: true }
interface StoredMetric {
  name: string; value: number; id: string; delta: number;
  rating: "good" | "needs-improvement" | "poor"; navigationType: string;
  path?: string; domain?: string; deviceType?: DeviceType; receivedAt: string;
}

const DEVICE_LABEL: Record<DeviceType, string> = { mobile: "모바일", tablet: "태블릿", desktop: "웹" };
const UNIT: Record<string, string> = { LCP: "ms", INP: "ms", CLS: "", TTFB: "ms" };
const order = ["LCP", "INP", "CLS", "TTFB"];

const metrics = ref<StoredMetric[]>([]);
const loading = ref(false);
const selectedDomain = ref("all");
const selectedPath = ref("all");
const selectedDevice = ref("all");
const appDomains = ref<AppDomain[]>([]);
const scannedAt = ref("");

function formatValue(name: string, value: number) {
  return name === "CLS" ? value.toFixed(3) : Math.round(value).toLocaleString();
}
function metricDomain(m: StoredMetric) {
  return m.domain ?? (m.path === "/" ? "/" : `/${(m.path ?? "/").split("/").filter(Boolean)[0] ?? ""}`);
}

onMounted(() => {
  fetch("/web-vital/api/domains").then((r) => r.json()).then((d) => {
    appDomains.value = d.domains ?? [];
    scannedAt.value = d.scannedAt ?? "";
  }).catch(() => {});
});

async function load() {
  loading.value = true;
  try {
    const res = await fetch("/web-vital/api");
    metrics.value = (await res.json()).metrics ?? [];
  } finally { loading.value = false; }
}

const domainFiltered = computed(() =>
  selectedDomain.value === "all" ? metrics.value : metrics.value.filter((m) => metricDomain(m) === selectedDomain.value));
const pathOptions = computed(() => {
  const routes = selectedDomain.value === "all" ? [] : (appDomains.value.find((d) => d.domain === selectedDomain.value)?.routes ?? []);
  return ["all", ...Array.from(new Set([...routes, ...domainFiltered.value.map((m) => m.path ?? "/")])).sort()];
});
const filtered = computed(() => domainFiltered.value.filter((m) => {
  if (selectedPath.value !== "all" && (m.path ?? "/") !== selectedPath.value) return false;
  if (selectedDevice.value !== "all" && (m.deviceType ?? "desktop") !== selectedDevice.value) return false;
  return true;
}));
const latestByType = computed(() => {
  const acc: Record<string, StoredMetric> = {};
  for (const m of filtered.value) if (!acc[m.name]) acc[m.name] = m;
  return acc;
});
</script>

<template>
  <div class="wv-dashboard">
    <h1>Web Vitals 대시보드</h1>
    <p class="wv-hint"><code>pages/</code> 1뎁스 폴더 자동 스캔 — <code>/series</code>, <code>/alarm</code>, <code>/my-voice</code> 등</p>
    <div v-if="appDomains.length" class="wv-tags">
      <span v-for="d in appDomains" :key="d.domain" class="wv-tag">{{ d.domain }}</span>
    </div>
    <button type="button" :disabled="loading" @click="load">{{ loading ? "조회 중…" : "조회" }}</button>
    <div class="wv-filters">
      <label>도메인<select v-model="selectedDomain" @change="selectedPath = 'all'"><option value="all">전체</option><option v-for="d in appDomains" :key="d.domain" :value="d.domain">{{ d.domain }}</option></select></label>
      <label v-if="pathOptions.length > 1">페이지<select v-model="selectedPath"><option v-for="p in pathOptions" :key="p" :value="p">{{ p === "all" ? "전체" : p }}</option></select></label>
    </div>
    <div class="wv-cards">
      <div v-for="name in order" :key="name" class="wv-card">
        <div>{{ name }}</div>
        <div class="wv-val">{{ latestByType[name] ? `${formatValue(name, latestByType[name].value)}${UNIT[name]}` : "—" }}</div>
      </div>
    </div>
    <table v-if="filtered.length" class="wv-table">
      <thead><tr><th>도메인</th><th>페이지</th><th>지표</th><th>값</th></tr></thead>
      <tbody>
        <tr v-for="(m, i) in filtered.slice(0, 50)" :key="i">
          <td>{{ metricDomain(m) }}</td><td>{{ m.path ?? "/" }}</td><td>{{ m.name }}</td>
          <td>{{ formatValue(m.name, m.value) }}{{ UNIT[m.name] }}</td>
        </tr>
      </tbody>
    </table>
    <p v-else class="wv-empty">아직 수집된 지표 없음.</p>
  </div>
</template>

<style scoped>
.wv-dashboard { padding: 1.5rem; max-width: 56rem; margin: 0 auto; font-family: system-ui, sans-serif; }
.wv-hint { color: #71717a; font-size: 0.875rem; }
code { background: #f4f4f5; padding: 0 0.25rem; border-radius: 0.25rem; }
.wv-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 1rem 0; }
.wv-tag { border: 1px solid #e4e4e7; border-radius: 9999px; padding: 0.25rem 0.75rem; font-size: 0.75rem; }
.wv-filters { display: flex; gap: 1rem; margin: 1rem 0; }
.wv-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0; }
.wv-card { border: 1px solid #e4e4e7; border-radius: 0.75rem; padding: 1rem; }
.wv-val { font-size: 1.25rem; font-weight: 600; }
.wv-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.wv-table th, .wv-table td { border-bottom: 1px solid #f4f4f5; padding: 0.5rem; text-align: left; }
.wv-empty { color: #71717a; }
button { background: #18181b; color: #fff; border: none; border-radius: 0.5rem; padding: 0.5rem 1rem; }
</style>
