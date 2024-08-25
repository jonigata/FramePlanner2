// 型定義
type WrapDetectorResult = {
  size: number;
  wrap: boolean;
};

type WrapDetector = (chars: string[]) => WrapDetectorResult;

type KinsokuResult = {
  index: number;
  text: string;
  size: number | null;
  wrap: boolean;
};

function makeTable(chars: string): Set<string> {
  return new Set(chars.trim().replace(/\n/g, "").split(''));
}

const leaderChars: Set<string> = makeTable(`
'"（〔［｛〈《「『【
([{
`);

const trailerChars: Set<string> = makeTable(`
、。，．・：；？！ー"）〕］｝〉》」』】
ヽヾゝゞ々
ぁぃぅぇぉっゃゅょゎ
ァィゥェォッャュョヮ
,.:;?!-\" ')]}
`);

const maxBurasageDepth = 2;
const maxOidashiDepth = 2;

function* kinsokuGenerator(
  wrapDetector: WrapDetector,
  wrapSize: number | null,
  getNext: () => string | null,
  startIndex: number
): Generator<KinsokuResult> {
  let index = startIndex;

  const buffer: string[] = [];
  let cursor = 0;

  function peek(): string | null {
    if (cursor < buffer.length) { return buffer[cursor]; }
    const next = getNext();
    if (next != null) { buffer.push(next); }
    return next;
  }

  function countOidashi(): number {
    for (let back = 0; back < maxOidashiDepth; back++) {
      if (!leaderChars.has(buffer[cursor-1-back])) { return back; }
    }
    return maxOidashiDepth;
  }

  let lineSize: number | null = null;
  while (true) {
    const c = peek();
    if (c == null) { break; }

    if (cursor === 0) { 
      cursor = 1;
      lineSize = 1;
      continue;
    } else {
      const { size, wrap } = wrapDetector(buffer.slice(0, cursor+1));
      if (!wrap) { lineSize = size; cursor++; continue; }
    }

    if (wrapSize != null) { lineSize = wrapSize; }

    let back = countOidashi();
    if (back === 0) {
      for (let depth = 0; depth < maxBurasageDepth; depth++) {
        const c = peek();
        if (c === null || !trailerChars.has(c)) { break; }
        cursor++;
      }
    } else {
      cursor -= back;
    }

    const text = buffer.splice(0, cursor).join('');
    yield { index, text, size: lineSize, wrap: true };
    index += text.length;
    cursor = 0;
  }

  if (0 < buffer.length) {
    yield { index, text: buffer.join(''), size: lineSize, wrap: false }; 
  }
}

export function kinsoku(
  wrapDetector: WrapDetector,
  wrapSize: number | null,
  ss: string
): KinsokuResult[] {
  let a: KinsokuResult[] = [];
  let startIndex = 0;
  for (let s of ss.split('\n')) {
    let i = 0;
    function getNext(): string | null {
      if (s.length <= i) { return null; }
      if (isEmojiAt(s, i)) { const c = getEmojiAt(s, i); i+=c.length; return c; }
      return s.charAt(i++);
    }
    a.push(...kinsokuGenerator(wrapDetector, wrapSize, getNext, startIndex));
    startIndex += s.length + 1;
  }
  return a;
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

/*
const a = kinsoku((s: string[]) => {
  return { size: s.length, wrap: 5 < s.length };
}, 5, "♫⏯😥♫⏯");
*/