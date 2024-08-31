interface Segment {
  content: string;
  color?: string;
  ruby?: string;
  romanHanging?: boolean;
}

export function parseMarkdownToJson(sourceText: string): Segment[] {
  const colorPattern = /\{([^{}]+)\|([^{}]+)\}/;
  const rubyPattern = /\[([^\[\]]+)\]\(([^\(\)]+)\)/;
  const romanHangingPattern = /\<\<([^<>]+)\>\>/;

  function parse(text: string, color?: string, ruby?: string): Segment[] {
    const result: Segment[] = [];
    let remainingText = text;

    while (remainingText) {
      const colorMatch = remainingText.match(colorPattern);
      const rubyMatch = remainingText.match(rubyPattern);
      const romanHangingMatch = remainingText.match(romanHangingPattern);

      const matches = [
        { type: 'color', match: colorMatch },
        { type: 'ruby', match: rubyMatch },
        { type: 'romanHanging', match: romanHangingMatch }
      ].filter(m => m.match).sort((a, b) => a.match!.index! - b.match!.index!);

      if (matches.length > 0) {
        const { type, match } = matches[0];
        const [fullMatch, content, param] = match!;
        const index = match!.index!;

        if (index > 0) {
          result.push({ content: remainingText.slice(0, index), color, ruby });
        }

        switch (type) {
          case 'color':
            result.push(...parse(content, param, ruby));
            break;
          case 'ruby':
            result.push(...parse(content, color, param));
            break;
          case 'romanHanging':
            result.push({ content, color, ruby, romanHanging: true });
            break;
        }

        remainingText = remainingText.slice(index + fullMatch.length);
      } else {
        result.push({ content: remainingText, color, ruby });
        remainingText = '';
      }
    }

    return result;
  }

  return parse(sourceText);
}

export interface RichFragment {
  chars: string[];
  color?: string;
  ruby?: string[];
  romanHanging?: boolean;
}

function getCompleteEmojiSequence(text: string, index: number): string | null {
  const regex = /(\p{Emoji}(\uFE0F|\u200D\p{Emoji})*)/u;
  const match = text.slice(index).match(regex);
  if (match && match.index === 0) {
    return match[0];
  }
  return null;
}

function isLatin1(char: string): boolean {
  return /^[\u0000-\u00FF]$/.test(char);
}

function* characterGroupIterator(text: string): Generator<string, void, unknown> {
  let current = '';
  let isCurrentLatin1 = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i];
    const emojiSequence = getCompleteEmojiSequence(text, i);

    if (emojiSequence) {
      if (current) yield current;
      yield emojiSequence;
      current = '';
      isCurrentLatin1 = false;
      i += emojiSequence.length;
    } else if (isLatin1(char)) {
      if (isCurrentLatin1) {
        current += char;
      } else {
        if (current) yield current;
        current = char;
        isCurrentLatin1 = true;
      }
      i++;
    } else {
      if (current) yield current;
      yield char;
      current = '';
      isCurrentLatin1 = false;
      i++;
    }
  }

  if (current) yield current;
}

export function* richTextIterator(segments: Segment[]): Generator<RichFragment, void, unknown> {
  for (const segment of segments) {
    const chars = [...characterGroupIterator(segment.content)];
    
    if (segment.ruby) {
      yield {
        chars: chars,
        color: segment.color,
        ruby: [...characterGroupIterator(segment.ruby)],
        romanHanging: segment.romanHanging
      };
    } else if (segment.romanHanging) {
      yield {
        chars: [segment.content],
        color: segment.color,
        romanHanging: segment.romanHanging
      };
    } else {
      for (const char of chars) {
        yield {
          chars: [char],
          color: segment.color,
          romanHanging: segment.romanHanging
        };
      }
    }
  }
}

/*
// 使用例
const segments: Segment[] = [
  { content: "これは" },
  { content: "赤い", color: "red" },
  { content: "文字", ruby: "もじ" },
  { content: "と" },
  { content: "ABC", romanHanging: true },
  { content: "絵文字😊と" },
  { content: "Latin1 text", romanHanging: true },
  { content: "そしてひらがな" },
  { content: "赤いABCだよ" }   
];

console.log([...richTextIterator(segments)]);

[
  { "chars": ["こ"], "color": undefined, "romanHanging": undefined },
  { "chars": ["れ"], "color": undefined, "romanHanging": undefined },
  { "chars": ["は"], "color": undefined, "romanHanging": undefined },
  { "chars": ["赤"], "color": "red", "romanHanging": undefined },
  { "chars": ["い"], "color": "red", "romanHanging": undefined },
  { "chars": ["文", "字"], "color": undefined, "ruby": ["も", "じ"], "romanHanging": undefined },
  { "chars": ["と"], "color": undefined, "romanHanging": undefined },
  { "chars": ["ABC"], "color": undefined, "romanHanging": true },
  { "chars": ["絵"], "color": undefined, "romanHanging": undefined },
  { "chars": ["文"], "color": undefined, "romanHanging": undefined },
  { "chars": ["字"], "color": undefined, "romanHanging": undefined },
  { "chars": ["😊"], "color": undefined, "romanHanging": undefined },
  { "chars": ["と"], "color": undefined, "romanHanging": undefined },
  { "chars": ["Latin1 text"], "color": undefined, "romanHanging": true },
  { "chars": ["そ"], "color": undefined, "romanHanging": undefined },
  { "chars": ["し"], "color": undefined, "romanHanging": undefined },
  { "chars": ["て"], "color": undefined, "romanHanging": undefined },
  { "chars": ["ひ"], "color": undefined, "romanHanging": undefined },
  { "chars": ["ら"], "color": undefined, "romanHanging": undefined },
  { "chars": ["が"], "color": undefined, "romanHanging": undefined },
  { "chars": ["な"], "color": undefined, "romanHanging": undefined },
  { "chars": ["赤"], "color": undefined, "romanHanging": undefined },
  { "chars": ["い"], "color": undefined, "romanHanging": undefined },
  { "chars": ["ABC"], "color": undefined, "romanHanging": undefined },
  { "chars": ["だ"], "color": undefined, "romanHanging": undefined },
  { "chars": ["よ"], "color": undefined, "romanHanging": undefined }
]
*/