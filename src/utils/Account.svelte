<script lang="ts">
  import { accountUser, onlineAccount } from "./accountStore";
  import { app } from "../firebase";
  import { getDatabase, child, ref, push, set, get } from "firebase/database";

  $: onSetAccount($accountUser);
  async function onSetAccount(user) {
    if (!user) { return; }
    const userId = user.uid;
    const database = getDatabase(app);
    const accountsRef = ref(database, 'accounts');
    const accountRef = child(accountsRef, userId);
    const feathralRef = child(accountRef, 'feathral');
    const feathral = await get(feathralRef);

    $onlineAccount = {
      feathral: feathral.val() ?? 25
    };
  }
</script>
