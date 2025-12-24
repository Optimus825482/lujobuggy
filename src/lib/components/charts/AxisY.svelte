<script lang="ts">
  import { getContext } from 'svelte';

  const { xRange, yScale } = getContext('LayerCake');

  interface Props {
    tickMarks?: boolean;
    gridlines?: boolean;
    format?: (d: any) => string;
  }

  let { 
    tickMarks = false, 
    gridlines = true,
    format = (d: any) => d
  }: Props = $props();

  let isBandwidth = $derived(typeof $yScale.bandwidth === 'function');
  let tickVals = $derived(isBandwidth ? $yScale.domain() : $yScale.ticks(5));
  let halfBand = $derived(isBandwidth ? $yScale.bandwidth() / 2 : 0);
</script>

<g class="axis y-axis">
  {#each tickVals as tick}
    {@const tickY = $yScale(tick) + halfBand}
    <g class="tick" transform="translate({$xRange[0]}, {tickY})">
      {#if gridlines}
        <line 
          class="gridline" 
          x1="0" 
          x2={$xRange[1] - $xRange[0]} 
          stroke="#e2e8f0" 
          stroke-dasharray="3,3" 
        />
      {/if}
      {#if tickMarks}
        <line class="tick-mark" x1="-6" x2="0" stroke="#94a3b8" />
      {/if}
      <text x="-10" dy="4" text-anchor="end" fill="#64748b" font-size="11">
        {format(tick)}
      </text>
    </g>
  {/each}
</g>
