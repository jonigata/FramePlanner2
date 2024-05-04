import { aiChat } from "../firebase";
import { AIArgumentError, callServant, type FunctionCalling } from "./servant";
import type { Context } from "./servantContext";
import { makePage } from "./storyboardServant";
import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
import { protocolChatLogToRichChatLog, richChatLogToProtocolChatLog, rollback } from "../utils/richChat";
import type { RichChatLog, ProtocolChatLog, RichChatDocument } from "../utils/richChat";

export type { Context };

export type Response = {
  type: string;
  message?: string;
}

export class MascotController {
  logs: RichChatLog[] = [];

  constructor(logs: RichChatLog[]) {
    const defaultLog: RichChatLog[] = [{ role: 'assistant', content: {type: 'speech', body: '何について調べますか～？'} }];
    this.logs = logs;
    if (logs.length == 0) {
      this.logs = [...defaultLog];
    }
  }

  addLogs(logs: RichChatLog[]) {
    this.logs.splice(this.logs.length, 0, ...logs);
  }

  rollback() {
    rollback(this.logs, "assistant");
    rollback(this.logs, "user");
  }

  addUserLog(input: RichChatLog) {
    this.logs.push(input);
  }

  async addAssistantLog(refresh: (log: RichChatLog[]) => void, context: Context) {
    const log = this.logs;

    // waiting
    log.push({ role: 'assistant', content: null });
    refresh(log);

    const documents = log.filter(l => l.content != null && l.content.type === 'document').map(l => l.content.body as RichChatDocument);

    //const r = await aiChat(log.slice(0,-1));
    const r = await executeProcessAndNotify(
      5000, "カイルがお返事してます", 
      async () => {
        return await aiChat(richChatLogToProtocolChatLog(log.slice(0, -1)), documents);
      });
    console.log("RESULT", r);
    //await new Promise((resolve) => setTimeout(resolve, 2));
    //const r = "まだ実装してないよ～";
    //callServant(context, { tool: "createBubble", parameters: { text: "うひひ", position: [0.5, 0.5] } })

    log.pop();

    const json = this.parse(r.result);
    console.log("JSON", json);
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
          this.post("ネームを作ってページを追加しておいたよ～")
          break;
        default:
          throw new AIArgumentError(`不明な判断: ${json.type}`)
      }
    }
    refresh(log);

    return r.feathral;
  }

  post(s: string) {
    const newLog: ProtocolChatLog[] = [{ role: 'assistant', content: s}]
    this.logs.push(...protocolChatLogToRichChatLog(newLog));
    console.log(this.logs);
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
    this.logs = [{ role: 'assistant', content: {type: 'speech', body: '何について調べますか～？'}}];
  }

  addDummyLog(n) {
    const dummyLogs: ProtocolChatLog[][] = [
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
      ],
      [
        {role: 'user', content: '漫画のキャラクターを考えて。お題は「異世界転生したUber Eats」'},
        {role: 'assistant', content: `了解～！異世界に転生したUber Eatsの配達員のキャラクターを考えるね～
\`\`\`characters
性別：男
年齢：20歳
性格：明るくて前向き、ちょっとドジだけど一生懸命
容姿：痩せ型、黒髪でちょっと長め、黒縁メガネ
特徴：異世界でもUber Eatsのジャケットとリュックを身につけている
設定：
・現代日本からゲームの世界に転生した
・転生した世界でも、Uber Eatsの配達員として働いている
・配達先は、お城だったり、武器屋だったり、魔法使いの塔だったり
・配達中に、色んなトラブルに巻き込まれるけど、知恵と度胸で乗り越える
・剣と魔法のファンタジー世界で、自転車とスマホ片手に配達する姿が面白い
・徐々にその世界の人々と交流を深め、異世界にも馴染んでいく
\`\`\`
`},
        {role: 'user', content: '主人公は女の子がいいな。なんJ民みたいな性格ね'},
        {role: 'assistant', content: `了解～！異世界に転生したUber Eatsの配達員のキャラクターを考えるね～
\`\`\`characters
名前：川上 奈々（かわかみ なな）
あだ名：ななJ
性別：女
年齢：19歳
性格：明るくて活発、少しおてんばで毒舌家、面白いことが大好き
容姿：ショートヘアで茶髪、スポーティな服装、笑顔が特徴的
特徴：異世界でもUber Eatsのジャケットとリュックを身につけている
設定：
・現代日本からゲームの世界に転生した
・転生した世界でも、Uber Eatsの配達員として働いている
・配達先でのトラブルは、毒舌と機転で切り抜ける
・面白half可愛half
・男勝りな言葉遣いだけど、意外と世話焼きで面倒見がいい
・ツッコミどころ満載の配達風景で、異世界の人々を笑わせている
・異世界の人々からは、ちょっと変わった配達員として認知されつつある
\`\`\`
こんな感じでどうかな～？ななJの個性が出せたかな～？`},
        {role: 'user', content: '4コマ漫画で連載するね。第一話のネームを考えてください。性格はなんJ民だけど、セリフはきららっぽくしてね'},
        {role: 'assistant', content: 'できたよ～'},
      ]      
    ];

    this.addLogs(protocolChatLogToRichChatLog(dummyLogs[n]));
  }

}