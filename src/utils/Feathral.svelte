<script lang="ts">
  import { onlineAccount } from "../utils/accountStore";
  import feathralIcon from '../assets/feathral.png';

  $: feathral = $onlineAccount?.feathral;
</script>

<div class="flex flex-row">
  <img src={feathralIcon} alt="feathral" width=24 height=24/>
  <span class="caption">Feathral: {feathral}</span>
</div>

<style>
  .caption {
    font-family: '源暎アンチック';
    font-size: 18px;
  }
</style>
