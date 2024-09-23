<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { onlineAccount } from "../utils/accountStore";
  import { getDatabase } from "../firebase";
  import { ref, off, onValue, type DatabaseReference } from "firebase/database";

  const messages = {
    "storyboarding": ["ネームを考えてるよ","みなぎってきた","セリフどうしようかな","このコマは……","あれれ？","これはきっと面白い","イケる！","神作","いいねいいね","100万部突破"],
    "designing": ["絵はどうしようかな","カメラも工夫しなきゃ"],
    "theme": ["テーマはどうしようかな","テーマ決めよう","どんなテーマがいいかな","衝撃の問題作","全米が泣いた"],
    "characters": ["いいキャラ考えよう","どんなキャラ出そうかな","かっこいい！","かわいいね～","この子は人気出る","相性が悪そう","コスプレされそう"],
    "plot": ["お話考えてるよ","こうしたら面白いかな","これじゃイマイチかな？","こうするといいのでは","これは売れる","起伏が足りない","あっそうか","クライマックスは……","序盤はこうかな","ここでひねって……","最高なのでは！？","あっきたきた"],
    "classifying": ["さて","ふむ","ふむふむ","うんうん"],
    "answering": ["調べるね","ちょっとまってね","えっと～"],
    "operating": ["操作してるよ","こうして……っと"],
    "creativeRouting": ["え～と","そっか～","なるほど～"],
    "other": ["むむ？","ふむふむ","ふむ～","あら～"],
  };
  let message: string | null = null;
  let aiStatusRef: DatabaseReference = null;
  let q = null;

  onMount(() => {
    // firebase realtime databaseの/Users/${$accountUser.uid}/aiStatusを監視する
    const database = getDatabase();
    aiStatusRef = ref(database, `/Users/${$onlineAccount.user.uid}/aiStatus`);
    onValue(aiStatusRef, (snapshot) => {
      const data = snapshot.val();
      console.log(data);
      const messageSources = messages[data];
      clearInterval(q);
      if (messageSources) {
        message = messageSources[Math.floor(Math.random() * messageSources.length)];
        q = setInterval(() => {
          message = messageSources[Math.floor(Math.random() * messageSources.length)];
        }, 5000);
      } else {
        message = null;
      }
    });
  });

  onDestroy(() => {
    if (aiStatusRef) {
      off(aiStatusRef);
    }
  });
</script>

<div class="mascot-status-region">
  {#if message != null}
    <div class="mascot-status-container rounded-container-token">
      <div class="mascot-status">
        {message}
      </div>
    </div>
  {/if}
</div>

<style>
  .mascot-status-region {
    position: absolute;
    width: 256px;
    height: 260px;
    right: 0px;
    bottom: 0px;
    display: flex;
    justify-content: center; /* Center items horizontally */
    align-items: flex-start;
    pointer-events: none;
  }
  .mascot-status-container {
    display: flex;
    padding: 8px;
    background: rgba(255, 255, 255, 1.0); /* Optional: Semi-transparent background */
    border-width: 2px;;
    border-color: black;
    border-radius: 8px; /* Optional: Rounded corners */
  }
  .mascot-status {
    transition: opacity 0.2s;
    font-family: 'Kaisei Decol';
    font-size: 18px;
    font-weight: 900;
    color: #000;
    z-index: 9999;
  }
</style>