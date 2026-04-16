<template>
  <div class="card">

    <!-- HEADER -->
    <div class="header">

      <div class="title">
        <h3>PHÂN BỐ DOANH THU</h3>
      </div>

      <select v-model="range">
        <option value="7">7 ngày</option>
        <option value="30">30 ngày</option>
        <option value="90">90 ngày</option>
      </select>

    </div>

    <!-- CHART -->
    <v-chart
      class="chart"
      :option="option"
      autoresize
    />

  </div>
</template>

<script setup>

import { ref, computed } from "vue"
import VChart from "vue-echarts"
import { use } from "echarts/core"

import { CanvasRenderer } from "echarts/renderers"
import { BarChart, LineChart } from "echarts/charts"

import {
GridComponent,
TooltipComponent,
MarkLineComponent
} from "echarts/components"

use([
CanvasRenderer,
BarChart,
LineChart,
GridComponent,
TooltipComponent,
MarkLineComponent
])

/* dropdown */

const range = ref("7")

/* bins */

const bins = [
"0-1tr","1-2tr","2-3tr","3-4tr","4-5tr",
"5-6tr","6-7tr","7-8tr","8-9tr","9-10tr",
"10-11tr","11-12tr","12-13tr","13-14tr",
"14-15tr",">15tr"
]

/* data */

const data7 = [
70,119,175,252,609,637,532,350,245,119,63,35,21,14,7
]

const data30 = [
280,544,800,1008,2784,2821,2204,1550,1085,476,270,160,84,62,31
]

const data90 = [
980,1649,2025,3312,8004,8099,6688,4450,3360,1445,864,415,297,164,95
]

/* select data */

const currentData = computed(()=>{

if(range.value==="7") return data7
if(range.value==="30") return data30
return data90

})

/* total */

const total = computed(()=>{

return currentData.value.reduce((a,b)=>a+b,0)

})

/* gaussian curve */

function gaussian(data){

const max=Math.max(...data)

return data.map(v=>{

return Math.round((v/max)*max*0.8)

})

}

/* median */

function getMedianIndex(data){

let sum=0
let half=total.value/2

for(let i=0;i<data.length;i++){

sum+=data[i]

if(sum>=half) return i

}

return 0

}

const medianIndex = computed(()=>getMedianIndex(currentData.value))

/* chart option */

const option = computed(()=>({

animationDuration:500,

tooltip:{
backgroundColor:"#fff",
borderColor:"#eee",
borderWidth:1,
textStyle:{color:"#333"},
formatter:(p)=>{

const percent=((p.value/total.value)*100).toFixed(1)

return `
<b>${p.name}</b><br/>
Số trạm: <b>${p.value}</b><br/>
Tỷ lệ: <b>${percent}%</b>
`
}
},

grid:{
top:20,
left:0,
right:0,
bottom:40
},

xAxis:{
type:"category",
data:bins,
axisLine:{show:false},
axisTick:{show:false},
axisLabel:{
color:"#666",
fontSize:11
}
},

yAxis:{
type:"value",
axisLine:{show:false},
axisTick:{show:false},
axisLabel:{color:"#666"},
splitLine:{
lineStyle:{color:"#eee"}
}
},

series:[

{
type:"bar",
data:currentData.value,
barWidth:"70%",
itemStyle:{
color:{
type:"linear",
x:0,
y:0,
x2:0,
y2:1,
colorStops:[
{offset:0,color:"#6366f1"},
{offset:1,color:"#4338ca"}
]
},
borderRadius:[4,4,0,0]
},
markLine:{
symbol:"none",
lineStyle:{
color:"#ef4444",
type:"dashed"
},
data:[
{
xAxis:bins[medianIndex.value],
label:{
formatter:"Median"
}
}
]
}
},

{
type:"line",
data:gaussian(currentData.value),
smooth:true,
symbol:"none",
lineStyle:{
width:3,
color:"#f59e0b"
}
}

]

}))

</script>

<style scoped>

.card{
height:380px;
background: var(--bg-card);
border-radius:12px;
padding:20px;
box-shadow: var(--shadow-card);
transition: background 0.2s ease, box-shadow 0.2s ease;
}

.header{
  display:flex;
  justify-content:space-between;
  align-items:center;
  width:100%;
}

.title h3{
margin:20;
font-size:18px;
font-weight:600;
color: var(--text-main);
}

.subtitle{
font-size:12px;
color: var(--text-faint);
}

select{
border: none;
box-shadow: inset 0 0 0 1px rgba(128, 128, 128, 0.15);
border-radius:6px;
padding:4px 8px;
font-size:12px;
background: var(--bg-surface);
color: var(--text-muted);
}

.chart{
height:300px;
}

</style>