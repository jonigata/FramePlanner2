import { createPreferenceStore, assurePreferences } from '../preferences';

assurePreferences();

// MaterialBucket
export const MaterialBucket_closeOnDragStore = createPreferenceStore<boolean>('tweakUi', 'MaterialBucket_closeOnDrag', true);
