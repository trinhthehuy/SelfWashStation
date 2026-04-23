<script setup>

import CardKPI from "../components/card-kpi.vue"
import RevenueChart from "../components/revenue-chart.vue"
import TopTable from "../components/top-table.vue"
import RevenueHeatmap from "../components/revenue-heatmap.vue"

</script>

<template>

<div class="dashboard">

  <!-- KPI -->
  <div class="kpi-wrapper">
    <CardKPI/>
  </div>

  <!-- MAIN LAYOUT -->
  <div class="main-grid">

    <!-- LEFT: Top Performance (spans full height) -->
    <div class="left-panel">
      <TopTable/>
    </div>

    <!-- RIGHT: stacked -->
    <div class="right-panel">
      <RevenueChart/>
      <RevenueHeatmap/>
    </div>

  </div>

</div>

</template>


<style scoped>

.dashboard{
height:100%;
display:flex;
flex-direction:column;
gap:15px;
background: var(--bg-body);
font-family:Inter,system-ui,Arial;
transition: background 0.2s ease;
}

/* KPI */

.kpi-wrapper{
flex-shrink:0;
}

/* Main 2-column layout */

.main-grid{
display:grid;
grid-template-columns:1.618fr 1fr;
gap:15px;
flex:1;
min-height:0;
}

/* Left panel: TopTable full height */

.left-panel{
display:flex;
flex-direction:column;
min-height:0;
min-width:0;
}

.left-panel > *{
flex:1;
min-height:0;
min-width:0;
}

/* Right panel: stacked */

.right-panel{
display:flex;
flex-direction:column;
gap:15px;
min-height:0;
min-width:0;
}

.right-panel > *{
flex:1;
min-height:0;
min-width:0;
}

/* Responsive */

@media(max-width:1200px){

.main-grid{
grid-template-columns:1fr;
}

.right-bottom{
grid-template-columns:1fr;
}

}

@media (max-width: 768px) {
  .dashboard {
    height: 100%;
    gap: 10px;
    overflow-y: auto;
    overflow-x: hidden;
  }

  .kpi-wrapper {
    flex-shrink: 0;
  }

  .main-grid {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
    flex: none;
    min-height: auto;
    gap: 10px;
  }

  .left-panel {
    flex: none;
    min-height: 0;
  }

  .left-panel > * {
    flex: none;
    height: 420px;
  }

  .right-panel {
    flex: none;
    gap: 10px;
  }

  /* Right panel children control their own height via component CSS */
  .right-panel > * {
    flex: none;
  }
}

</style>