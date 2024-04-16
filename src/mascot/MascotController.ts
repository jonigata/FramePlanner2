import { aiChat } from "../firebase";
import { AIArgumentError, callServant, type FunctionCalling } from "./servant";
import type { Context } from "./servantContext";
import { makePage } from "./storyboardServant";
import { executeProcessAndNotify } from "../utils/executeProcessAndNotify";
import { richChatLogToProtocolChatLog, type RichChatLog } from "../utils/richChat";

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

  addDummyLog(logs: RichChatLog[]) {
    this.logs.splice(this.logs.length, 0, ...logs);
  }

  rollback() {
    this.logs.length = Math.max(1, this.logs.length - 2);
  }

  addUserLog(input: RichChatLog) {
    this.logs.push(input);
  }

  async addAssistantLog(refresh: (log: RichChatLog[]) => void, context: Context) {
    const log = this.logs;

    // waiting
    log.push({ role: 'assistant', content: null });
    refresh(log);

    //const r = await aiChat(log.slice(0,-1));
    const r = await executeProcessAndNotify(
      5000, "カイルがお返事してます", 
      async () => {
        return await aiChat(richChatLogToProtocolChatLog(log.slice(0, -1)));
      });
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
    this.logs.push({ role: 'assistant', content: {type: 'speech', body: s} })
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

    const dummy: RichChatLog[] = [
      {role: 'user', content: {type: 'speech', body: '漫画のキャラクターを考えて。お題は「異世界転生したUber Eats」'}},
      {role: 'assistant', content: {type: 'speech', body: '了解～！異世界に転生したUber Eatsの配達員のキャラクターを考えるね～'}},
      {role: 'assistant', content: {type: 'document', body: { id: 'dummy', text: `
名前：タクミ
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
`}}},
      {role: 'user', content: {type: 'speech', body: '主人公は女の子がいいな。なんJ民みたいな性格ね'}},
      {role: 'assistant', content: {type: 'speech', body: '了解～！異世界に転生したUber Eatsの配達員のキャラクターを考えるね～'}},
      {role: 'assistant', content: {type: 'document', body: {id: 'dummy', text: `
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
`}}},
      {role: 'assistant', content: {type: 'speech', body: 'こんな感じでどうかな～？ななJの個性が出せたかな～？'}},
      {role: 'user', content: {type: 'speech', body: '4コマ漫画で連載するね。第一話のネームを考えてください。性格はなんJ民だけど、セリフはきららっぽくしてね'}},
      {role: 'assistant', content: {type: 'speech', body: 'できたよ～'}},
    ];
  }
}