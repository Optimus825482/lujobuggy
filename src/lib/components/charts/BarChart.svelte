<script lang="ts">
  import { LayerCake, Svg } from 'layercake';
  import { scaleBand } from 'd3-scale';
  import Bar from './Bar.svelte';
  import AxisX from './AxisX.svelte';
  import AxisY from './AxisY.svelte';

  interface Props {
    data: Array<{ label: string; value: number }>;
    xKey?: string;
    yKey?: string;
    fill?: string;
    height?: number;
  }

  let { data, xKey = 'value', yKey = 'label', fill = '#0891b2', height = 250 }: Props = $props();
</script>

<div class="chart-container" style="height: {height}px;">
  {#if data.length > 0}
    <LayerCake
      padding={{ bottom: 30, left: 80 }}
      x={xKey}
      y={yKey}
      yScale={scaleBand().paddingInner(0.1)}
      xDomain={[0, null]}
      {data}
    >
      <Svg>
        <AxisX tickMarks baseline snapLabels />
        <AxisY tickMarks gridlines={false} />
        <Bar {fill} />
      </Svg>
    </LayerCake>
  {:else}
    <div class="flex items-center justify-center h-full text-gray-400">
      Veri bulunamadı
    </div>
  {/if}
</div>

<style>
  .chart-container {
    width: 100%;
  }
</style>
