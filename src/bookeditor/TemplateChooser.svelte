<script lang="ts">
  import Drawer from '../utils/Drawer.svelte'
  import { frameExamples } from '../lib/layeredCanvas/tools/frameExamples';
  import { triggerTemplateChoice, type FrameLayoutSample } from './templateChooserStore';
  import TemplateSample from './TemplateSample.svelte';
  import FrameLayoutTemplateSample from './FrameLayoutTemplateSample.svelte';
  import { gadgetFileSystem, loadFrameLayoutFrom, saveFrameLayoutTo, type FrameLayoutTemplateData } from '../filemanager/fileManagerStore';
  import type { BindId } from '../lib/filesystem/fileSystem';
  import { sortableList } from '../utils/sortableList';
  import { moveInArray } from '../utils/moveInArray';

  let userTemplates: [FrameLayoutTemplateData, BindId][] = [];

  $: onOpen($triggerTemplateChoice.isActive);
  async function onOpen(active: boolean) {
    if (!active) return;
    await buildUserTemplates();
  }

  async function buildUserTemplates() {
    userTemplates = [];
    if (!$gadgetFileSystem) return;
    const root = await $gadgetFileSystem.getRoot();
    const folderNode = await root.getNodeByName("コマ割りテンプレート");
    if (!folderNode) return;
    const folder = folderNode.asFolder();
    if (!folder) return;
    const entries = await folder.listEmbodied();
    for (const entry of entries) {
      const data = await loadFrameLayoutFrom(entry[2].asFile()!);
      userTemplates.push([data, entry[0]]);
    }
    userTemplates = userTemplates;
  }

  function onClickBuiltin(key: string) {
    const e = frameExamples[key];
    triggerTemplateChoice.resolve({
      templateName: e.templateName,
      frameTree: e.frameTree,
      bubbles: e.bubbles,
    } as FrameLayoutSample);
  }

  function onClickUser(data: FrameLayoutTemplateData) {
    triggerTemplateChoice.resolve({
      templateName: "custom",
      frameTree: data.frameTree,
      bubbles: data.bubbles,
    });
  }

  function onClickAway() {
    triggerTemplateChoice.resolve(null);
  }

  async function deleteUserTemplate(bindId: BindId) {
    const root = await $gadgetFileSystem!.getRoot();
    const folder = (await root.getNodeByName("コマ割りテンプレート"))!.asFolder()!;
    const entry = await folder.getEntry(bindId);
    await folder.unlink(bindId);
    if (entry) await root.fileSystem.destroyNode(entry[2]);
    await buildUserTemplates();
  }

  async function renameUserTemplate(data: FrameLayoutTemplateData, bindId: BindId, name: string) {
    data.displayName = name;
    const root = await $gadgetFileSystem!.getRoot();
    const folder = (await root.getNodeByName("コマ割りテンプレート"))!.asFolder()!;
    const file = (await folder.getEmbodiedEntry(bindId))![2].asFile()!;
    await saveFrameLayoutTo(data, file);
    userTemplates = userTemplates;
  }

  async function onUserSortUpdate(e: { oldIndex: number | undefined; newIndex: number | undefined }) {
    if (e.oldIndex == null || e.newIndex == null) return;
    moveInArray(userTemplates, e.oldIndex, e.newIndex);
    userTemplates = userTemplates;
    await reorderUserTemplates(e.oldIndex, e.newIndex);
  }

  async function reorderUserTemplates(oldIndex: number, newIndex: number) {
    try {
      const root = await $gadgetFileSystem!.getRoot();
      const folder = (await root.getNodeByName("コマ割りテンプレート"))!.asFolder()!;
      const entries = await folder.list();
      if (oldIndex < 0 || oldIndex >= entries.length) return;
      if (newIndex < 0 || newIndex >= entries.length) newIndex = entries.length - 1;

      const [bindId, name, nodeId] = entries[oldIndex];
      await folder.unlink(bindId);
      const adjustedNewIndex = newIndex > oldIndex ? newIndex - 1 : newIndex;
      await folder.insert(name, nodeId, adjustedNewIndex);
    } catch (err) {
      console.error('Failed to persist frame layout template order:', err);
    }
  }
</script>

<div class="drawer-outer">
  <Drawer
    open={$triggerTemplateChoice.isActive}
    placement="right"
    size="480px"
    on:clickAway={onClickAway}
  >
    <div class="drawer-content">
      {#each Object.keys(frameExamples) as sampleKey}
        <TemplateSample sample={frameExamples[sampleKey]} on:click={() => onClickBuiltin(sampleKey)}/>
      {/each}
      {#if userTemplates.length > 0}
        <div class="template-section-label">登録テンプレート（ドラッグで並べ替え）</div>
        <div
          class="template-list"
          use:sortableList={{
            animation: 150,
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            onUpdate: onUserSortUpdate
          }}
        >
          {#each userTemplates as [data, bindId] (bindId)}
            <FrameLayoutTemplateSample
              data={data}
              on:click={() => onClickUser(data)}
              on:delete={() => deleteUserTemplate(bindId)}
              on:rename={(e) => renameUserTemplate(data, bindId, e.detail.name)}
            />
          {/each}
        </div>
      {/if}
    </div>
  </Drawer>
</div>

<style>
  .drawer-outer :global(.drawer .panel) {
    background-color: rgb(var(--color-surface-100));
  }
  .drawer-content {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin: 16px;
  }
  .template-section-label {
    width: 100%;
    font-size: 0.85rem;
    color: rgb(var(--color-surface-600));
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid rgb(var(--color-surface-300));
  }
  .template-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    width: 100%;
  }
  :global(.sortable-ghost) {
    opacity: 0.5;
  }
  :global(.sortable-chosen) {
    box-shadow: 0 0 0 2px rgba(0, 100, 255, 0.3);
  }
</style>
