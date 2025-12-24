<script lang="ts">
  import { getContext } from 'svelte';

  const { width, height, xScale, yRange } = getContext('LayerCake');

  interface Props {
    tickMarks?: boolean;
    baseline?: boolean;
    snapLabels?: boolean;
    format?: (d: any) => string;
    ticks?: number;
  }

  let { 
    tickMarks = false, 
    baseline = false, 
    snapLabels = false,
    format = (d: any) => d,
    ticks = 5
  }: Props = $props();

  let tickVals = $derived(
    typeof $xScale.ticks === 'function' 
      ? $xScale.ticks(ticks) 
      : $xScale.domain()
  );
</script>

<g class="axis x-axis">
  {#each tickVals as tick}
    {@const tickX = $xScale(tick)}
    <g class="tick" transform="translate({tickX}, {$yRange[0]})">
      {#if tickMarks}
        <line class="tick-mark" y1="0" y2="6" stroke="#94a3b8" />
      {/if}
      <text y="20" text-anchor="middle" fill="#64748b" font-size="11">
        {format(tick)}
      </text>
    </g>
  {/each}
  {#if baseline}
    <line 
      class="baseline" 
      x1="0" 
      x2={$width} 
      y1={$yRange[0]} 
      y2={$yRange[0]} 
      stroke="#e2e8f0" 
    />
  {/if}
</g>
