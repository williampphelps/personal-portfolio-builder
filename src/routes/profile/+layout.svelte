<script lang="ts">
	import type { LayoutProps } from "./$types";
	let { data, children }: LayoutProps = $props();
</script>

<pre>
	{JSON.stringify(data, null, 2)}
</pre>

{@render children()}
