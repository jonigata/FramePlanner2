<script lang="ts">
  import { imageGeneratorOpen, imageGeneratorPrompt, imageGeneratorGallery, imageGeneratorChosen } from "./imageGeneratorStore";
  import { frameImageGeneratorTarget, frameImageConstraintToken } from "./frameImageGeneratorStore";

  frameImageGeneratorTarget.subscribe(
    (target) => {
      if (target) {
        imageGeneratorPrompt.set(target.prompt);
        imageGeneratorGallery.set(target.gallery);
        imageGeneratorOpen.set(true);
      }
    });

  imageGeneratorChosen.subscribe(
    (chosen) => {
      if (chosen) {
        imageGeneratorOpen.set(false);
        imageGeneratorChosen.set(null);
        $frameImageGeneratorTarget.image = chosen;
        $frameImageConstraintToken = true;
      }
    });
</script>

