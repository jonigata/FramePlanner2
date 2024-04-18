export type ProtocolChatLog = { role: string, content: string };

export type RichChatLog = {
  role: 'system' | 'assistant' | 'user' | 'error';
  content: RichChatContent;
  hidden?: boolean;
}

// 識別共用体のための型定義
export type RichChatContent =
  | { type: 'speech'; body: string }
  | { type: 'image'; body: RichChatImage }
  | { type: 'document'; body: RichChatDocument };

// その他の型定義
export type RichChatImage = {
  id: string;
  image: HTMLImageElement;
}

export type RichChatDocument = {
  id: string;
  text: string;
}

export function richChatLogToProtocolChatLog(log: RichChatLog[]): ProtocolChatLog[] {
  const converted = [];
  for (const l of log) {
    switch (l.content.type) {
      case 'speech':
        converted.push({ role: l.role, content: l.content.body as string });
        break;
      case 'image':
        break;
      case 'document':
        const doc = l.content.body as RichChatDocument;
        converted.push({ role: l.role, content: `\`\`\`${doc.id}\n${doc.text}\`\`\`` });
        break;
    }
  }
  
  // 連続するroleが同じものは結合する
  const merged = [];
  let prevRole = '';
  let prevContent = '';
  for (const c of converted) {
    if (prevRole === c.role) {
      prevContent += '\n' + c.content;
    } else {
      if (prevContent) {
        merged.push({ role: prevRole, content: prevContent });
      }
      prevRole = c.role;
      prevContent = c.content;
    }
  }
  if (prevContent) {
    merged.push({ role: prevRole, content: prevContent });
  }
  return merged;
}

export function protocolChatLogToRichChatLog(log: ProtocolChatLog[]): RichChatLog[] {
  const converted = [];
  for (const l of log) {
    // もしcontentの中に```id\nbody```の部分があれば、documentとして扱う
    // document前後は通常のspeechとして扱う
    const match = l.content.match(/(.*)```([^]+)\n([^]+)```(.*)/);
    if (match) {
      if (match[1].length > 0) {
        converted.push({
          role: l.role,
          content: {
            type: 'speech',
            body: match[1],
          }
        });
      }
      converted.push({
        role: l.role,
        content: {
          type: 'document',
          body: {
            id: match[2],
            text: match[3],
          }
        }
      });
      if (match[4].length > 0) {
        converted.push({
          role: l.role,
          content: {
            type: 'speech',
            body: match[4],
          }
        });
      }
    } else {
      converted.push({
        role: l.role,
        content: {
          type: 'speech',
          body: l.content,
        }
      });
    }

  }
  return converted;
}
