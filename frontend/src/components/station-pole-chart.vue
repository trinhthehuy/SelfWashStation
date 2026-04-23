<template>
<div class="card">
  <div class="header">
    <span class="title">SỐ LƯỢNG TRẠM / TRỤ</span>
    <span class="badge">12 tháng</span>
  </div>
  <div class="chart-wrap">
    <v-chart class="echart" :option="option" autoresize />
  </div>
</div>
</template>

<script setup>
import { computed } from "vue"

function getLast12Months() {
  const months = []
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`T${d.getMonth() + 1}`)
  }
  return months
}

const labels = getLast12Months()

const stationData = [320, 348, 369, 392, 410, 431, 445, 464, 480, 503, 527, 551]
const poleData    = [1280,1372,1449,1524,1659,1788,1879,1943,2082,2170,2279,2353]

const option = computed(() => ({
  tooltip: {
    trigger: 'axis',
    backgroundColor: '#1e293b',
    borderColor: 'transparent',
    padding: [10, 14],
    textStyle: { color: '#f8fafc', fontSize: 12 },
    axisPointer: {
      type: 'shadow',
      shadowStyle: { color: 'rgba(99,102,241,0.06)' }
    },
    formatter: (params) => {
      const month = params[0].axisValue
      return params.map(p =>
        `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:6px"></span>
         ${p.seriesName}: <b>${p.value.toLocaleString()}</b>`
      ).join('<br/>')
    }
  },
  legend: {
    bottom: 0,
    icon: 'circle',
    itemWidth: 8,
    itemHeight: 8,
    itemGap: 20,
    textStyle: { color: '#64748b', fontSize: 11 }
  },
  grid: {
    top: 16, left: 52, right: 52, bottom: 36
  },
  xAxis: {
    type: 'category',
    data: labels,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: '#94a3b8', fontSize: 11 }
  },
  yAxis: [
    {
      type: 'value',
      name: 'Trạm',
      nameTextStyle: { color: '#6366f1', fontSize: 10, padding: [0, 0, 0, -30] },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: v => v >= 1000 ? (v/1000)+'K' : v }
    },
    {
      type: 'value',
      name: 'Trụ',
      nameTextStyle: { color: '#10b981', fontSize: 10, padding: [0, -30, 0, 0] },
      splitLine: { show: false },
      axisLabel: { color: '#94a3b8', fontSize: 10, formatter: v => v >= 1000 ? (v/1000).toFixed(1)+'K' : v }
    }
  ],
  series: [
    {
      name: 'Trạm',
      type: 'bar',
      yAxisIndex: 0,
      data: stationData,
      barMaxWidth: 18,
      barGap: '20%',
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#818cf8' },
            { offset: 1, color: '#6366f1' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: { itemStyle: { color: '#4f46e5' } }
    },
    {
      name: 'Trụ',
      type: 'bar',
      yAxisIndex: 1,
      data: poleData,
      barMaxWidth: 18,
      itemStyle: {
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: '#34d399' },
            { offset: 1, color: '#10b981' }
          ]
        },
        borderRadius: [4, 4, 0, 0]
      },
      emphasis: { itemStyle: { color: '#059669' } }
    }
  ]
}))
</script>

<style scoped>
.card {
  background: var(--bg-card);
  border-radius: 16px;
  padding: 16px 18px 10px;
  display: flex;
  flex-direction: column;
  height: 380px;
  box-sizing: border-box;
  box-shadow: var(--shadow-card);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  flex-shrink: 0;
}
.title {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  transition: color 0.2s ease;
}
.badge {
  font-size: 10px;
  font-weight: 600;
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  padding: 2px 8px;
  border-radius: 99px;
}

.chart-wrap {
  flex: 1;
  min-height: 0;
}
.echart {
  width: 100%;
  height: 100%;
}
</style>
