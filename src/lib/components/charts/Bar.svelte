<script lang="ts">
  import { getContext } from 'svelte';

  const { data, xGet, yGet, xScale, yScale } = getContext('LayerCake');

  interface Props {
    fill?: string;
  }

  let { fill = '#0891b2' }: Props = $props();
</script>

<g class="bar-group">
  {#each $data as d, i}
    <rect
      class="group-rect"
      data-id={i}
      x={$xScale.range()[0]}
      y={$yGet(d)}
      height={$yScale.bandwidth()}
      width={$xGet(d)}
      {fill}
      rx="4"
    ></rect>
  {/each}
</g>

<style>
  .group-rect {
    transition: opacity 0.2s;
  }
  .group-rect:hover {
    opacity: 0.8;
  }
</style>
