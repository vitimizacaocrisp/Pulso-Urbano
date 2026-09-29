<template>
  <div ref="host" class="chart-viewer" role="img" :aria-label="title || 'Gráfico'"></div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

export interface ChartPoint {
  label?: string
  x?: number
  y?: number
  z?: number
}

const props = withDefaults(defineProps<{
  kind: 'bar' | 'line' | 'pie' | 'scatter' | 'bar3d' | 'scatter3d' | 'surface'
  data: ChartPoint[]
  title?: string
}>(), {
  title: '',
})

const host = ref<HTMLElement | null>(null)
// \`any\`: o tipo real (echarts.ECharts) só existe depois do import dinâmico —
// tipá-lo puxaria o pacote inteiro pro grafo de tipos do resto do app.
let chart: any = null
let resizeObserver: ResizeObserver | null = null

const THEME_COLORS = ['#2f6fed', '#0adf83', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
const is3D = (kind: string) => kind === 'bar3d' || kind === 'scatter3d' || kind === 'surface'

// Traduz os pontos (formato único, ver chartPointSchema) pro \`option\` do
// ECharts — cada tipo usa só os campos que precisa.
function buildOption(kind: string, data: ChartPoint[], title: string): any {
  const base = {
    color: THEME_COLORS,
    title: title ? { text: title, textStyle: { fontSize: 14 } } : undefined,
    tooltip: {},
  }

  if (kind === 'pie') {
    return {
      ...base,
      legend: { bottom: 0, type: 'scroll' },
      series: [{
        type: 'pie',
        radius: '65%',
        data: data.map((p) => ({ name: p.label || String(p.x), value: p.y })),
      }],
    }
  }

  if (kind === 'bar' || kind === 'line') {
    return {
      ...base,
      grid: { left: 40, right: 16, top: title ? 40 : 16, bottom: 32 },
      xAxis: { type: 'category', data: data.map((p) => p.label || String(p.x)) },
      yAxis: { type: 'value' },
      series: [{ type: kind, data: data.map((p) => p.y), smooth: kind === 'line' }],
    }
  }

  if (kind === 'scatter') {
    return {
      ...base,
      grid: { left: 40, right: 16, top: title ? 40 : 16, bottom: 32 },
      xAxis: { type: 'value' },
      yAxis: { type: 'value' },
      series: [{ type: 'scatter', data: data.map((p) => [p.x, p.y]), symbolSize: 10 }],
    }
  }

  // 3D (bar3d/scatter3d/surface): eixos numéricos nos três, mesma grade.
  const axis3D = { type: 'value' as const }
  const grid3D = { viewControl: { autoRotate: false } }
  if (kind === 'surface') {
    return {
      ...base,
      xAxis3D: axis3D, yAxis3D: axis3D, zAxis3D: axis3D, grid3D,
      series: [{
        type: 'surface',
        data: data.map((p) => [p.x, p.y, p.z]),
        shading: 'color',
        itemStyle: { color: THEME_COLORS[0] },
      }],
    }
  }
  return {
    ...base,
    xAxis3D: axis3D, yAxis3D: axis3D, zAxis3D: axis3D, grid3D,
    series: [{
      type: kind, // 'bar3D' | 'scatter3D' (ver normalização abaixo)
      data: data.map((p) => [p.x, p.y, p.z]),
      itemStyle: { color: THEME_COLORS[0] },
    }],
  }
}

// echarts-gl registra os tipos com "D" maiúsculo ('bar3D'/'scatter3D'), mas o
// resto do app usa a convenção minúscula do schema ('bar3d'/'scatter3d') —
// normaliza só na hora de montar a option, sem vazar a grafia pro schema.
const echartsSeriesType = (kind: string) => (kind === 'bar3d' ? 'bar3D' : kind === 'scatter3d' ? 'scatter3D' : kind)

async function render() {
  if (!host.value) return
  const echarts = await import('echarts')
  if (is3D(props.kind)) await import('echarts-gl')
  if (!chart) chart = echarts.init(host.value)
  const option = buildOption(props.kind, props.data, props.title)
  if (option.series?.[0]) option.series[0].type = echartsSeriesType(option.series[0].type)
  chart.setOption(option, true)
}

onMounted(async () => {
  await render()
  if (host.value) {
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(host.value)
  }
})

watch(() => [props.kind, props.data, props.title], render, { deep: true })

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped>
.chart-viewer {
  width: 100%;
  height: 100%;
  min-height: 200px;
}
</style>
