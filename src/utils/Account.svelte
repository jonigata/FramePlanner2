<script lang="ts">
  import { accountUser, onlineAccount, updateToken } from "./accountStore";
  import { updateFeathral } from "../firebase";

  $: onSetAccount($accountUser, $updateToken);
  async function onSetAccount(user, updateToken) {
    if (!user) { return; }
    if (updateToken) { $updateToken = false; }
    const n = await updateFeathral();

    $onlineAccount = {
      feathral: n
    };
  }
</script>
