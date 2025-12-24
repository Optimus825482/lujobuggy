<script lang="ts">
	import '../app.css';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import Navbar from '$lib/components/Navbar.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Lujo Buggy Shuttle</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<div class="min-h-screen bg-slate-900">
	<Navbar />
	<main class="pt-1">
		{@render children()}
	</main>
</div>
