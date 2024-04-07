import { aiChat } from "../firebase";
import { AIError, AIArgumentError, callServant, type FunctionCalling } from "./servant";
import type { Context } from "./servantContext";
import { makePage } from "./storyboardServant";
export type { Context };

export type Log = {
  role: 'assistant' | 'user' | 'error';
  content: string;
}

export type Response = {
  type: string;
  message?: string;
}

export class MascotController {
  log: Log[] = [{ role: 'assistant', content: '何について調べますか～？' }];

  constructor() {
    const dummyLog: Log[] = [
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

    this.log = this.log.concat(dummyLog);
  }

  async add(refresh: (log: Log[]) => void, input: string, context: Context) {
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