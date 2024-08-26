interface Segment {
  content: string;
  color?: string;
  ruby?: string;
  rotated?: boolean;
}

export function parseMarkdownToJson(sourceText: string): Segment[] {
  const colorPattern = /\{([^{}]+)\|([^{}]+)\}/;
  const rubyPattern = /\[([^\[\]]+)\]\(([^\(\)]+)\)/;
  const rotatedPattern = /\<\<([^<>]+)\>\>/;

  function parse(text: string, color?: string, ruby?: string): Segment[] {
    const result: Segment[] = [];
    let remainingText = text;

    while (remainingText) {
      const colorMatch = remainingText.match(colorPattern);
      const rubyMatch = remainingText.match(rubyPattern);
      const rotatedMatch = remainingText.match(rotatedPattern);

      const matches = [
        { type: 'color', match: colorMatch },
        { type: 'ruby', match: rubyMatch },
        { type: 'rotated', match: rotatedMatch }
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
          case 'rotated':
            result.push({ content, color, ruby, rotated: true });
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

export interface RichChar {
  chars: string[];
  color?: string;
  ruby?: string;
  rotated?: boolean;
}

export function isEmojiAt(str: string, index: number): boolean {
  const codePoint = String.fromCodePoint(str.codePointAt(index) || 0);
  const regex = /\p{Emoji}/u;

  return regex.test(codePoint);
}

export function getEmojiAt(str: string, index: number): string {
  let endIndex = index + 1;
  if (str.codePointAt(index) && str.codePointAt(index)! > 0xFFFF) {
    endIndex++;
  }
  return str.slice(index, endIndex);
}

function isLatin1(char: string): boolean {
  return /^[\u0000-\u00FF]$/.test(char);
}

function* characterGroupIterator(text: string): Generator<string, void, unknown> {
  let current = '';
  let isCurrentLatin1 = false;
  let i = 0;

  while (i < text.length) {
    if (isEmojiAt(text, i)) {
      if (current) yield current;
      yield getEmojiAt(text, i);
      current = '';
      isCurrentLatin1 = false;
      i += getEmojiAt(text, i).length;
    } else if (isLatin1(text[i])) {
      if (isCurrentLatin1) {
        current += text[i];
      } else {
        if (current) yield current;
        current = text[i];
        isCurrentLatin1 = true;
      }
      i++;
    } else {
      if (current) yield current;
      yield text[i];
      current = '';
      isCurrentLatin1 = false;
      i++;
    }
  }

  if (current) yield current;
}

export function* richTextIterator(segments: Segment[]): Generator<RichChar, void, unknown> {
  for (const segment of segments) {
    const chars = [...characterGroupIterator(segment.content)];
    
    if (segment.ruby) {
      yield {
        chars: chars,
        color: segment.color,
        ruby: segment.ruby,
        rotated: segment.rotated
      };
    } else if (segment.rotated) {
      yield {
        chars: [segment.content],
        color: segment.color,
        rotated: segment.rotated
      };
    } else {
      for (const char of chars) {
        yield {
          chars: [char],
          color: segment.color,
          rotated: segment.rotated
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
  { content: "ABC", rotated: true },
  { content: "絵文字😊と" },
  { content: "Latin1 text", rotated: true },
  { content: "そしてひらがな" },
  { content: "赤いABCだよ" }   
];

console.log([...richTextIterator(segments)]);

[
  { "chars": ["こ"], "color": undefined, "rotated": undefined },
  { "chars": ["れ"], "color": undefined, "rotated": undefined },
  { "chars": ["は"], "color": undefined, "rotated": undefined },
  { "chars": ["赤"], "color": "red", "rotated": undefined },
  { "chars": ["い"], "color": "red", "rotated": undefined },
  { "chars": ["文", "字"], "color": undefined, "ruby": "もじ", "rotated": undefined },
  { "chars": ["と"], "color": undefined, "rotated": undefined },
  { "chars": ["ABC"], "color": undefined, "rotated": true },
  { "chars": ["絵"], "color": undefined, "rotated": undefined },
  { "chars": ["文"], "color": undefined, "rotated": undefined },
  { "chars": ["字"], "color": undefined, "rotated": undefined },
  { "chars": ["😊"], "color": undefined, "rotated": undefined },
  { "chars": ["と"], "color": undefined, "rotated": undefined },
  { "chars": ["Latin1 text"], "color": undefined, "rotated": true },
  { "chars": ["そ"], "color": undefined, "rotated": undefined },
  { "chars": ["し"], "color": undefined, "rotated": undefined },
  { "chars": ["て"], "color": undefined, "rotated": undefined },
  { "chars": ["ひ"], "color": undefined, "rotated": undefined },
  { "chars": ["ら"], "color": undefined, "rotated": undefined },
  { "chars": ["が"], "color": undefined, "rotated": undefined },
  { "chars": ["な"], "color": undefined, "rotated": undefined },
  { "chars": ["赤"], "color": undefined, "rotated": undefined },
  { "chars": ["い"], "color": undefined, "rotated": undefined },
  { "chars": ["ABC"], "color": undefined, "rotated": undefined },
  { "chars": ["だ"], "color": undefined, "rotated": undefined },
  { "chars": ["よ"], "color": undefined, "rotated": undefined }
]
*/