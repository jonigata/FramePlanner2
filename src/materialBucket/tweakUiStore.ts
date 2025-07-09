import { createPreferenceStore, assurePreferences } from '../preferences';

// MaterialBucket
export const MaterialBucket_closeOnDragStore = createPreferenceStore<boolean>('tweakUi', 'MaterialBucket_closeOnDrag', true);
