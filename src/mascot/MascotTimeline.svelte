<script lang="ts">
  import { onMount } from "svelte";
  import { fontLoadToken, mainBook } from "../bookeditor/bookStore";
  import { ProgressRadial } from '@skeletonlabs/skeleton';
  import "../box.css";
  import { type Context, MascotController } from "./MascotController";
  import { type ChatLog, commitBook } from '../bookeditor/book';
  import Feathral from '../utils/Feathral.svelte';
  import { onlineAccount } from "../utils/accountStore";
  import DebugOnly from "../utils/DebugOnly.svelte";

  const debugSamples = [
    "にゃん",
    "ぬるぽ",
    "FramePlannerって何？",
    "Feathralって何？",
    "ネーム作って",
    "4コマ漫画で連載するね。1度に全部やらなくていいから、1本ずつ作っていこう。セリフはちゃんときららっぽくしてね",
  ]

  const controller = new MascotController($mainBook.chatLogs);
  let input = "";
  let key=0;
  let logs: ChatLog[] = controller.logs;
  let timelineElement: HTMLDivElement;

  $: onLogsChanged(logs);
  function onLogsChanged(logs: ChatLog[]) {
    if (timelineElement == null) { return; }
    setTimeout(() => {
      timelineElement.scrollTop = timelineElement.scrollHeight;
    }, 0); // 0ミリ秒の遅延で即時に実行されるが、DOMの更新を待つのに十分
  }

  const handleKeydown = (e) => {
    if (e.keyCode === 13) {
      if (e.shiftKey) {
        return;
      }
      e.preventDefault();
      onPost(input);
    }
  };  

  function onReset() {
    controller.reset();
    logs = controller.logs;
    key++;
  }

  function onRollback() {
    controller.rollback();
    logs = controller.logs;
    key++;
  }

  function onAddDummyLog(n) {
    const dummyLogs: ChatLog[][] = [
      [ 
        { role: 'user', content: `配達屋の漫画を作ろうと思います。
        キャラクターの性格を考えるときはなんJ民を思い浮かべて。
        ただしそれは表に出さないように、うまくかわいい感じに料理してください。
        まずはキャラクター設定をお願いします。主人公は女の子で、彼氏はいない。` },

        { role: 'assistant', content: `ゲーム好きのぽっちゃり女子・春香ちゃんなら、きららファンタジーにも登場しそうだね～
        根が明るくて前向きなところは、なんJ民っぽさを感じさせるかもしれないけど、
        そこはあくまで「芯の強さ」という形で表現するのがいいと思うよ～` },

        { role: 'user', content: `はるかちゃん、基本的に割とクズなんだけど、
        根はいい子なので大事なところは守るし憎めない感じにできないかな。その方がなんJ民っぽい。`},

        { role: 'assistant', content: `
        なるほど～じゃあ、ちょっと設定を変えてみるね～
    
        春香ちゃんは、基本的にはサボり癖があってだらしないんだけど、
        いざというときには頼りになる、憎めないキャラってことだね～
        
        じゃあ、ストーリーはこんな感じでどうかな～
        
        春香ちゃんは、いつものようにサボって公園でゲームをしていた～
        そこに、配達先の奥さんから「産気づいちゃった！」と電話が！
        でも春香ちゃんは、「めんどくせぇ～」と思いつつも、
        「ほな、ワイが病院まで連れてったるわ」と言って、奥さんを助けに行く。
        道中、陣痛に苦しむ奥さんをなだめつつ、必死で自転車をこぐ春香ちゃん。
        ようやく病院に到着し、奥さんを助けることができた！ほっとする春香ちゃん。
        でも、その間に他の荷物が全然配れていないことに気づいてあせる春香ちゃん。
        「ワイの配達員人生終わったンゴ…」と嘆く春香ちゃんだったが、
        上司から「お客さんを助けるなんて立派だ！」と褒められ、
        「ほな、もうちょいがんばるわ」と言って、配達員を続けることになった、というオチ。
        
        こんな感じで、サボり癖はあるけど、いざというときには頼りになる春香ちゃんを描けばいいかな～
        でも、ここからどうやってきらら風に変換するのか、ちょっと悩むね～` },
      ],

      [
        { role: 'user', content: `スパイものを作りたい。キャラクター考えて` },

        { role: 'assistant', content: `じゃあ、こんなキャラクターはどうかな～？
        
        主人公は若い女性スパイのエミリー～
        優秀だけど、少し抜けているところがある～
        でも、いざという時は頼りになるよ～
        
        相棒は男性スパイのジャック～
        クールで無口だけど、エミリーのことは信頼している～
        二人は普段はよくケンカするけど、困った時はお互いに助け合うんだ～
        
        敵は悪の組織のボス、ドクター・ブラック～
        世界征服を企む、狡猾な科学者だよ～
        でも、最後はエミリーとジャックの活躍で、悪の野望は打ち砕かれるんだ～
        
        どうかな？キャラクターのイメージ、湧いてきた～？
        エミリーの姿を考えて
        じゃあ、エミリーの姿はこんな感じかな～
        
        ・年齢は20代半ば～
        ・茶色の肩までのボブヘアー～
        ・大きな瞳の色は緑色～
        ・身長は160cm位の小柄な体型～
        ・普段は、ジーンズにTシャツ姿～
        ・スパイ活動の時は、黒のタイトなスーツに身を包むよ～
        ・腕には、特殊なスマートウォッチを付けている～
        ・表情は、ちょっぴり天然っぽい笑顔が特徴～
        ・でも、真剣な時は鋭い眼差しになるんだ～
        
        エミリーのイメージ、伝わったかな～？
        他に知りたいことがあれば、教えてね～`},
        
        {role:'user', content:`連載の第1回のイメージで、エミリーとジャックの登場する漫画考えてみて。4コマで。`},

        {role:'assistant', content:`じゃあ、4コマ漫画の第1回はこんな感じかな～
        
        1コマ目:
        エミリーとジャックが、ボスから新しい任務を受けている場面～
        ボス「君たちには、とても重要な任務がある」
        
        2コマ目:
        エミリーが興奮気味に任務内容を聞く場面～
        エミリー「やった！どんな任務ですか？」
        ジャック「···」(無言でクールな表情)
        
        3コマ目:
        ボスから任務内容を聞いて、がっかりするエミリーと、冷静なジャック～
        ボス「実は、君たちには···」
        ボス「私の飼い犬の散歩を頼みたいのだ」
        エミリー「えぇ～！？」
        
        4コマ目:
        しぶしぶ飼い犬の散歩をするエミリーと、普通に散歩するジャック～
        エミリー「スパイの任務じゃないじゃん···」
        ジャック「任務は任務だ」(真面目な表情)
        犬「ワン！」(嬉しそうな表情)
        
        どうかな？第1回のイメージ、つかめた～？
        続きが気になるような終わり方になったかな～？`}
      ]
    ];
    controller.addDummyLog(dummyLogs[n]);
    logs = controller.logs;
    key++;
  }

  async function onPost(content: string) {
    const context: Context = {
      book: $mainBook,
      pageIndex: 0,
    }
    try {
      const feathral = await controller.add(
        (clog) => {
          logs = clog;
          input=null;
          key++;
        },
        content,
        context);
      $onlineAccount.feathral = feathral;
      $mainBook.chatLogs = controller.logs;
      commitBook($mainBook, null);
      $mainBook = $mainBook;
      input = null;
      key++;
    }
    catch(e) {
      if (e.name === "AIError" || e.name === "AIArgumentError") {
        logs.length = logs.length - 1;
        logs.push({role: "error", content: e.message});
        input=null;
        key++;
      } else {
        console.error(e.message);
      }
    }
  }
  
  onMount(() => {
    $fontLoadToken = [{family: "Kaisei Decol", weight: "400"}, {family: "源暎エムゴ", weight: "400"}];
  });
</script>

<div class="timeline-container variant-glass-surface rounded-container-token">
  <div class="timeline rounded-container-token vbox" bind:this={timelineElement}>
    <div class="mascot variant-soft-primary rounded-container-token">
      やってほしいことを教えてね～　多分すぐにはできないけど、そのうちできるようになるよ～
    </div>
    {#key key}
      {#each logs as { role, content }, i}
        {#if role === 'assistant'}
          {#if content === null}
          <div class="mascot variant-soft-primary rounded-container-token w-24 flex justify-center">
            <ProgressRadial width="w-4"/>
          </div>
          {:else}
            <div class="mascot variant-soft-primary rounded-container-token">{content}</div>
          {/if}
        {/if}
        {#if role === 'user'}
          <div class="user variant-soft-tertiary rounded-container-token">{content}</div>
        {/if}
        {#if role === 'error'}
          <div class="error variant-soft-error rounded-container-token">{content}</div>
        {/if}
      {/each}
    {/key}
  </div>
  <textarea class="chat rounded-container-token" rows="4" cols="50" on:keydown={handleKeydown} bind:value={input}/>
  <DebugOnly>
    <div class="flex flex-wrap gap-1 justify-center">
      <div class="flex w-full gap-1 justify-center">
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onReset()}>
          reset
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onRollback()}>
          rollback
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(0)}>
          dummy1
        </button>
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onAddDummyLog(1)}>
          dummy2
        </button>
      </div>
      {#each debugSamples as sample}
        <button class="bg-secondary-500 text-white hover:bg-secondary-700 focus:bg-secondary-700 active:bg-secondary-900 function-button hbox" on:click={() => onPost(sample)}>
          {sample}
        </button>
      {/each}
    </div>
  </DebugOnly>
  <Feathral/>
</div>

<style>
  .timeline-container {
    position: absolute;
    left: 256px;
    bottom: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-bottom: 4px;
  }
  .timeline {
    margin: 8px;
    margin-bottom: 0px;
    width: 320px;
    height: 512px;
    background: rgba(var(--color-surface-50) / 1);
    white-space: pre-line;
    text-align: left;
    padding: 4px;
    gap: 2px;
    overflow-y: auto;
  }
  .chat {
    margin: 8px;
    padding: 4px;
    width: 95%;
    height: 50px;
    background: rgba(var(--color-surface-50) / 1);
    line-height: 1.3;
  }
  .user {
    color: var(--color-primary-50);
    font-family: '源暎エムゴ';
    max-width: 80%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-end;
  }
  .mascot {
    color: var(--color-primary-50);
    font-family: 'Kaisei Decol';
    max-width: 80%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-start;
  }
  .error {
    color: var(--color-error-50);
    font-family: 'Zen Maru Gothic';
    max-width: 100%;
    word-wrap: break-word;
    padding: 6px;
    align-self: flex-start;
  }
</style>