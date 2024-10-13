<script lang="ts">
	// retain module scoped expansion state for each tree node
	const _expansionState: { [key: string]: boolean } = {
		/* treeNodeId: expanded <boolean> */
	}

  //	import { slide } from 'svelte/transition'
	export let tree;

	let expanded = _expansionState[tree.label] || false
	const toggleExpansion = () => {
		expanded = _expansionState[tree.label] = !expanded
	}
	$: arrowDown = expanded
</script>

<ul><!-- transition:slide -->
	<li>
		{#if tree.children && tree.children.length > 0}
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<!-- svelte-ignore a11y-no-static-element-interactions -->
			<span on:click={toggleExpansion}>
				<span class="arrow" class:arrowDown>&#x25b6</span>
				{tree.label}
			</span>
			{#if expanded}
				{#each tree.children as child}
					<svelte:self tree={child} />
				{/each}
			{/if}
		{:else}
			<span>
				<span class="no-arrow"/>
				{tree.label}
			</span>
		{/if}
	</li>
</ul>

<style>
	ul {
		margin: 0;
		list-style: none;
		padding-left: 1.2rem; 
		user-select: none;
	}
	.no-arrow { padding-left: 1.0rem; }
	.arrow {
		cursor: pointer;
		display: inline-block;
		/* transition: transform 200ms; */
	}
	.arrowDown { transform: rotate(90deg); }
</style>
