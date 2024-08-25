interface TextSegment {
  type: 'text';
  content: string;
}

interface ColorSegment {
  type: 'color';
  content: string;
  color: string;
}

interface RubySegment {
  type: 'ruby';
  base: string;
  ruby: string;
}

export type Segment = TextSegment | ColorSegment | RubySegment;

export function parseMarkdownToJson(sourceText: string): Segment[] {
  let text = sourceText;
  const colorPattern = /\{([^|]+)\|([^}]+)\}/;
  const rubyPattern = /\[([^\]]+)\]\(([^\)]+)\)/;
  const result: Segment[] = [];

  while (text) {
    const colorMatch = text.match(colorPattern);
    const rubyMatch = text.match(rubyPattern);

    if (colorMatch && (!rubyMatch || colorMatch.index! < rubyMatch.index!)) {
      const [fullMatch, content, color] = colorMatch;
      const index = colorMatch.index!;
      
      if (index > 0) {
        result.push({ type: 'text', content: text.slice(0, index) });
      }
      result.push({ type: 'color', content, color });
      text = text.slice(index + fullMatch.length);
    } else if (rubyMatch) {
      const [fullMatch, base, ruby] = rubyMatch;
      const index = rubyMatch.index!;
      
      if (index > 0) {
        result.push({ type: 'text', content: text.slice(0, index) });
      }
      result.push({ type: 'ruby', base, ruby });
      text = text.slice(index + fullMatch.length);
    } else {
      result.push({ type: 'text', content: text });
      text = '';
    }
  }

  return result;
}

export interface RichChar {
  char: string;
  color?: string;
  ruby?: string;
}

export function* richTextIterator(segments: Segment[]): Generator<RichChar, void, unknown> {
  for (const segment of segments) {
    switch (segment.type) {
      case 'text':
        for (const char of segment.content) {
          yield { char };
        }
        break;
      case 'color':
        for (const char of segment.content) {
          yield { char, color: segment.color };
        }
        break;
      case 'ruby':
        for (let i = 0; i < segment.base.length; i++) {
          const char = segment.base[i];
          const ruby = i === 0 ? segment.ruby : undefined; // ルビは最初の文字にのみ付与
          yield { char, ruby };
        }
        break;
    }
  }
}

/*
// 使用例
const exampleText = "これは{赤色|red}の文字で、[難しい](むずかしい)にはルビがふってあります。";
const jsonOutput = parseMarkdownToJson(exampleText);
console.log("JSON出力:", JSON.stringify(jsonOutput, null, 2));
console.log("\n文字ごとの出力:");
for (const charInfo of richTextIterator(jsonOutput)) {
  console.log(charInfo);
}
*/
