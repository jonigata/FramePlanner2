// 型定義
type WrapDetectorResult = {
  size: number;
  wrap: boolean;
};

type WrapDetector = (chars: string[]) => WrapDetectorResult;

type KinsokuResult<T> = {
  index: number;
  buffer: T[];
  size: number;
  wrap: boolean;
};

function makeTable(chars: string): Set<string> {
  return new Set(chars.trim().replace(/\n/g, "").split(''));
}

export const leaderChars: Set<string> = makeTable(`
'"（〔［｛〈《「『【
([{
`);

export const trailerChars: Set<string> = makeTable(`
、。，．・：；？！ー"）〕］｝〉》」』】
ヽヾゝゞ々
ぁぃぅぇぉっゃゅょゎ
ァィゥェォッャュョヮ
,.:;?!-\" ')]}
`);

const maxBurasageDepth = 2;
const maxOidashiDepth = 2;

export function* kinsokuGenerator<T>(
  wrapDetector: (buffer: T[]) => { size: number; wrap: boolean },
  wrapSize: number | null,
  iterator: Iterator<T>,
  startIndex: number,
  isLeader: (char: T) => boolean,
  isTrailer: (char: T) => boolean
): Generator<KinsokuResult<T>> {
  let index = startIndex;
  const buffer: T[] = [];
  let cursor = 0;
  function peek(): T | null {
    if (cursor < buffer.length) { return buffer[cursor]; }
    const next = iterator.next();
    if (!next.done) { buffer.push(next.value); }
    return next.done ? null : next.value;
  }
  function countOidashi(): number {
    for (let back = 0; back < maxOidashiDepth; back++) {
      if (!isLeader(buffer[cursor-1-back])) { return back; }
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
        if (c === null || !isTrailer(c)) { break; }
        cursor++;
      }
    } else {
      cursor -= back;
    }
    const buffer2 = buffer.splice(0, cursor);
    yield { index, buffer: buffer2, size: lineSize!, wrap: true };
    index += buffer2.length;
    cursor = 0;
  }
  if (0 < buffer.length) {
    yield { index, buffer, size: lineSize!, wrap: false }; 
  }
}

export function kinsoku(
  wrapDetector: WrapDetector,
  wrapSize: number,
  ss: string
): {index: number; text: string; size: number | null; wrap: boolean;}[] {
  let a: KinsokuResult<string>[] = [];
  let startIndex = 0;
  for (let s of ss.split('\n')) {
    function* createIterator(): Iterator<string> {
      let i = 0;
      while (i < s.length) {
        if (isEmojiAt(s, i)) {
          const c = getEmojiAt(s, i);
          i += c.length;
          yield c;
        } else {
          yield s.charAt(i);
          i++;
        }
      }
    }

    a.push(...kinsokuGenerator(
      wrapDetector,
      wrapSize,
      createIterator(),
      startIndex,
      leaderChars.has.bind(leaderChars),
      trailerChars.has.bind(trailerChars)
    ));
    startIndex += s.length + 1;
  }
  const aa = a.map(({ index, buffer, size, wrap }) => ({ index, text: buffer.join(''), size, wrap }));
  return aa;
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