import { aiChat } from "../firebase";
import { AIArgumentError, callServant, type FunctionCalling } from "./servant";
import type { Context } from "./servantContext";
import { makePage } from "./storyboardServant";
import type { ChatLog } from '../bookeditor/book'

export type { Context };

export type Response = {
  type: string;
  message?: string;
}

export class MascotController {
  log: ChatLog[] = [{ role: 'assistant', content: '何について調べますか～？' }];

  constructor() {
    const dummyLog2: ChatLog[] = [ 
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
    ];

    const dummyLog: ChatLog[] = [
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
    ];

    this.log = this.log.concat(dummyLog2);
  }

  async add(refresh: (log: ChatLog[]) => void, input: string, context: Context) {
    const log = this.log;
    if (log[log.length - 1].role !== 'user') {
      log.push({ role: 'user', content: input });
    }

    // waiting
    log.push({ role: 'assistant', content: null });
    refresh(log);

    const r = await aiChat(log.slice(0,-1));
    console.log(r);
    //await new Promise((resolve) => setTimeout(resolve, 2));
    //const r = "まだ実装してないよ～";
    //callServant(context, { tool: "createBubble", parameters: { text: "うひひ", position: [0.5, 0.5] } })

    log.pop();

    const json = this.parse(r.result);
    if (typeof json === 'string') {
      this.post(r);
    } else {
      switch (json.type) {
        case 'chat':
          this.post(json.message);
          break;
        case 'operation':
          callServant(context, json.functionCall as FunctionCalling[]);
          this.post("やったよ～")
          break;
        case 'storyboard':
          console.log(json);
          makePage(context, json.data);
          this.post("できたよ～")
          break;
        default:
          throw new AIArgumentError(`不明な判断: ${json.type}`)
      }
    }
    refresh(log);

    return r.feathral;
  }

  post(s: string) {
    this.log.push({ role: 'assistant', content: s })
  }

  parse(content: string): any {
    try {
      const json = JSON.parse(content);
      return json;
    }
    catch (e) {
      return content;
    }
  }

  reset() {
    this.log = [{ role: 'assistant', content: '何について調べますか～？' }];
  }
}