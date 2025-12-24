<script lang="ts">
  import { pie, arc } from 'd3-shape';

  interface DataItem {
    label: string;
    value: number;
    color: string;
  }

  interface Props {
    data: DataItem[];
    size?: number;
    innerRadius?: number;
    showLabels?: boolean;
  }

  let { data, size = 200, innerRadius = 0, showLabels = true }: Props = $props();

  const pieGenerator = pie<DataItem>().value((d: DataItem) => d.value).sort(null);
  
  let arcGenerator = $derived(arc<any>().innerRadius(innerRadius).outerRadius(size / 2 - 10));
  let labelArc = $derived(arc<any>().innerRadius(size / 2 - 40).outerRadius(size / 2 - 40));

  let arcs = $derived(pieGenerator(data));
  let total = $derived(data.reduce((sum, d) => sum + d.value, 0));
</script>

<div class="pie-chart-container">
  <svg width={size} height={size}>
    <g transform="translate({size / 2}, {size / 2})">
      {#each arcs as arcData, i}
        <path
          d={arcGenerator(arcData) || ''}
          fill={data[i].color}
          stroke="white"
          stroke-width="2"
          class="pie-slice"
        >
          <title>{data[i].label}: {data[i].value} ({total > 0 ? Math.round(data[i].value / total * 100) : 0}%)</title>
        </path>
        {#if showLabels && data[i].value > 0}
          {@const [x, y] = labelArc.centroid(arcData)}
          <text
            x={x}
            y={y}
            text-anchor="middle"
            fill="white"
            font-size="11"
            font-weight="bold"
          >
            {Math.round(data[i].value / total * 100)}%
          </text>
        {/if}
      {/each}
    </g>
  </svg>
  
  <!-- Legend -->
  <div class="legend">
    {#each data as item}
      <div class="legend-item">
        <span class="legend-color" style="background-color: {item.color}"></span>
        <span class="legend-label">{item.label}</span>
        <span class="legend-value">{item.value}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .pie-chart-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }
  .pie-slice {
    transition: opacity 0.2s;
    cursor: pointer;
  }
  .pie-slice:hover {
    opacity: 0.8;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    justify-content: center;
  }
  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.75rem;
  }
  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 2px;
  }
  .legend-label {
    color: #64748b;
  }
  .legend-value {
    font-weight: 600;
    color: #334155;
  }
</style>
