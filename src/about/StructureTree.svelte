<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { structureTreeOpen } from './structureTreeStore';
  import TreeView from '../utils/TreeView.svelte';
  import { mainBook } from '../bookeditor/workspaceStore';
  import type { FrameElement } from '../lib/layeredCanvas/dataModels/frameTree';
  import { _ } from 'svelte-i18n';

/*
	const tree = {
		label: "USA", children: [
			{label: "Florida", children: [
				{label: "Jacksonville"},
				{label: "Orlando", children: [
					{label: "Disney World"},
					{label: "Universal Studio"},
					{label: "Sea World"},
				]},
				{label: "Miami"},
			]},
			{label: "California", children: [
				{label: "San Francisco"},
				{label: "Los Angeles"},
				{label: "Sacramento"},
			]},
		],
	}
*/
  let tree = {};

  type TreeItem = {
    label: string,
    children: TreeItem[]
  };

  function makePageItem(frameTree: FrameElement): TreeItem {
    const children = [];
    for (const child of frameTree.children) {
      const frameChildren = [];
      children.push(makePageItem(child));
    }
    let label = "leaf";
    if (frameTree.visibility === 0) {
      label = "hidden";
    }
    if (frameTree.direction === 'v') {
      label = 'vbox';
    } else if (frameTree.direction === 'h') {
      label = 'hbox';
    }
    return {label,children};
  }

  function setBook() {
    const book = $mainBook!;
    const children = [];
    let pageIndex = 0;
    for (const page of book.pages) {
      const item = makePageItem(page.frameTree);
      console.log("item", item);
      children.push({label: `${$_('about.page')}${++pageIndex}`, children: [item]});
    }

    tree = {
      label: $_('about.book'),
      children: children
    }
    console.log(tree);
  }

  $: if($structureTreeOpen) {
    setBook();
  }

  function copyToClipboard() {
    const json = JSON.stringify(tree);
    navigator.clipboard.writeText(json);
  }
</script>


<div class="drawer-outer">
<Drawer open={$structureTreeOpen} size="600px" on:clickAway={() => $structureTreeOpen = false}>
  <div class="drawer-content">
    <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={copyToClipboard}>
      copy
    </button>
  <TreeView bind:tree={tree}/>
  </div>
</Drawer>
</div>

<style>
  .drawer-content {
    width: 100%;
    height: 100%;
    font-family: 'Yu Gothic', sans-serif;
    font-weight: 500;
    text-align: left;
    padding-top: 16px;
    padding-left: 16px;
  }
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
</style>