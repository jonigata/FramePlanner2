<script lang="ts">
  import { onlineAccount } from "../utils/accountStore";
  import feathralIcon from '../assets/feathral.png';
</script>

<div class="hbox">
  <img src={feathralIcon} alt="feathral" width=24 height=24/>Feathral: {$onlineAccount.feathral}
</div>
