export type ProtocolChatLog = { role: string, content: string };

export type Role = 'system' | 'assistant' | 'user' | 'error';

export type RichChatLog = {
  role: Role;
  content: RichChatContent;
  hidden?: boolean;
}

// 識別共用体のための型定義
export type RichChatContent =
  | { type: 'speech'; body: string }
  | { type: 'image'; body: RichChatImage }
  | { type: 'document'; body: RichChatDocument }
  | { type: 'error'; body: string }
  | { type: 'waiting' };

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
        converted.push({ role: l.role, content: `\`\`\`${doc.id}\n${doc.text}\n\`\`\`` });
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
  const converted: RichChatLog[] = [];

  function flush(role: Role, content: string, documentTag: string | null) {
    content = content.trim();
    console.log(content.length, content)
    if (content.length === 0) return;
    if (documentTag != null) {
      converted.push({role, content: {type: 'document', body: {id: documentTag, text: content}}});
    } else {
      converted.push({role, content: {type: 'speech', body: content}});
    }
  }

  for (const l of log) {
    // contentの中に```で始まる行があれば、そこから次の```までをdocumentとして扱う
    let s = '';
    let documentTag: string | null = null;
    for (const line of l.content.split('\n')) {
      if (!line.startsWith('```')) {
        s += line + '\n';
        continue;
      }
      flush(l.role as Role, s, documentTag);
      s = '';
      if (documentTag == null) {
        documentTag = line.slice(3);
      } else {
        documentTag = null;
      }
    }
    flush(l.role as Role, s, documentTag);
  }
  return converted;
}

export function rollback(log: RichChatLog[], role: 'user' | 'assistant'): RichChatLog[] {
  const spliced: RichChatLog[] = [];
  for (let i = log.length - 1; i >= 0; i--) {
    const role2 = log[i].role;
    if (role == role2 || role2 === 'system' || role2 === 'error') {
      spliced.splice(0, 0, log[i]);
      log.splice(i, 1);
    } else {
      break;
    }
  }
  return spliced;
}
