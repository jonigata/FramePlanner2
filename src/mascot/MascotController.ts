import { aiChat } from "../firebase";
import { AIError, AIArgumentError, callServant, type FunctionCalling } from "./servant";
import type { Context } from "./servant";
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