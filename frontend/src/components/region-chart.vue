<template>

<div class="card">

<h3>DOANH THU THEO VÙNG</h3>

<v-chart
class="chart"
:option="option"
autoresize
/>

</div>

</template>

<script setup>

import { ref } from "vue"

import { use } from "echarts/core"
import VChart from "vue-echarts"

import { CanvasRenderer } from "echarts/renderers"
import { PieChart } from "echarts/charts"

import {
TooltipComponent,
LegendComponent
} from "echarts/components"


use([
CanvasRenderer,
PieChart,
TooltipComponent,
LegendComponent
])


const option = ref({

tooltip:{
trigger:"item"
},

legend:{
bottom:0
},

series:[
{
name:"Doanh thu vùng",

type:"pie",

radius:["50%","70%"],

avoidLabelOverlap:false,

data:[
{ value:45, name:"Ninh Bình" },
{ value:30, name:"Thanh Hóa" },
{ value:19, name:"Nam Định" },
{ value:6, name:"Khác" }
]
}
]

})

</script>

<style scoped>

.card{
height:400px;
background: var(--bg-card);
border-radius:12px;
padding:20px;
box-shadow: var(--shadow-card);
text-align:center;
transition: background 0.2s ease, box-shadow 0.2s ease;
}

.chart{
height: 350px;
}


</style>