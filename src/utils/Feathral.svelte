<script lang="ts">
  import { onlineAccount } from "../utils/accountStore";
  import sprytIcon from '../assets/spryt.webp';

  // 通貨単位はfeathral => sprytに変更
  // 内部データは変更困難なので、表示のみ変更

  $: feathral = $onlineAccount?.feathral;
</script>

<div class="flex flex-row">
  <img src={sprytIcon} alt="spryt" width=24 height=24 class="image-outline"/>
  <span class="caption">Spryt: {feathral}</span>
</div>

<style>
  .caption {
    font-family: '源暎アンチック';
    font-size: 18px;
  }
  .image-outline {
    filter: drop-shadow(0.5px 0 0 #fff8)
            drop-shadow(-0.5px 0 0 #fff8)
            drop-shadow(0 0.5px 0 #fff8)
            drop-shadow(0 -0.5px 0 #fff8);
  }
</style>
