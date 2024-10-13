import Sortable from 'sortablejs';
import type { Options } from 'sortablejs';

export type { SortableEvent } from 'sortablejs';

export function sortableList(node: HTMLElement, options: Partial<Options> = {}) {
  let sortableInstance: Sortable;

  function createSortable() {
    sortableInstance = new Sortable(node, options);
  }

  function destroySortable() {
    if (sortableInstance) {
      sortableInstance.destroy();
    }
  }

  createSortable();

  return {
    update(newOptions: Partial<Options>) {
      destroySortable();
      options = { ...options, ...newOptions };
      createSortable();
    },
    destroy() {
      destroySortable();
    }
  };
}
