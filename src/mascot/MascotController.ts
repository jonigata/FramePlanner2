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
  logs: ChatLog[] = [{ role: 'assistant', content: '何について調べますか～？' }];

  constructor(logs: ChatLog[]) {
    const defaultLog: ChatLog[] = [{ role: 'assistant', content: '何について調べますか～？' }];
    this.logs = logs;
    if (logs.length == 0) {
      this.logs = [...defaultLog];
    }
  }

  addDummyLog(logs: ChatLog[]) {
    this.logs.splice(this.logs.length, 0, ...logs);
  }

  rollback() {
    this.logs.length = Math.max(1, this.logs.length - 2);
  }

  async add(refresh: (log: ChatLog[]) => void, input: string, context: Context) {
    const log = this.logs;
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
    this.logs.push({ role: 'assistant', content: s })
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
    this.logs = [{ role: 'assistant', content: '何について調べますか～？' }];
  }
}