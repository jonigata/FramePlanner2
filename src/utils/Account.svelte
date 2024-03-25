<script lang="ts">
  import { accountUser, onlineAccount } from "./accountStore";
  import { updateFeathral } from "../firebase";

  $: onSetAccount($accountUser);
  async function onSetAccount(user) {
    if (!user) { return; }
    const n = await updateFeathral();

    $onlineAccount = {
      feathral: n
    };
  }
</script>
