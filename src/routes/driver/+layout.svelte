<script lang="ts">
  import '../../app.css';
  
  let { children } = $props();
</script>

<!-- Standalone layout for driver app - no sidebar -->
{@render children()}
