import { APIError } from "openai";
import { aiChat, aiEdit } from "../firebase";
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

    const r = await aiChat(log);
    //await new Promise((resolve) => setTimeout(resolve, 2));
    //const r = "まだ実装してないよ～";

    const json = this.parse(r);
    console.log(json);
    if (typeof json === 'string') {
      post(r);
    } else {
      switch (json.type) {
        case 'message':
          post(json.message);
          break;
        case 'operation':
          await this.edit(json.instruction, context);
          break;
        default:
          throw new AIArgumentError(`不明な判断: ${json.type}`)
      }
    }
    refresh(log);
  }

  async edit(instruction: string, context: Context) {
    const r = await aiEdit(instruction);
    console.log("edit", r);
    try {
      const json = JSON.parse(r);
      callServant(context, json as FunctionCalling);
      this.post("やったよ～")
    }
    catch (e) {
      throw new AIError(`AIエラー: ${e.message}`);
    }
  }

  post(s: string) {
    this.log[this.log.length - 1].content = s;
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