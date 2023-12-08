function makeTable(chars) {
  return new Set(chars.trim().replace(/\n/g, "").split(''));
}

const leaderChars = makeTable(`
‘“（〔［｛〈《「『【
([{
`);

const trailerChars = makeTable(`
、。，．・：；？！ー”）〕］｝〉》」』】
ヽヾゝゞ々
ぁぃぅぇぉっゃゅょゎ
ァィゥェォッャュョヮ
,.:;?!-\" ')]}
`);

const maxBurasageDepth = 2;
const maxOidashiDepth = 2;

function* kinsokuGenerator(wrapDetector, wrapSize, getNext, startIndex) {
  let index = startIndex;

  const buffer = [];
  let cursor = 0;

  function peek() {
    if (cursor < buffer.length) { return buffer[cursor]; }
    const next = getNext();
    if (next != null) { buffer.push(next); }
    return next;
  }

  function countOidashi() {
    for (let back = 0 ; back < maxOidashiDepth ; back++) {
      // index<0のときはundefinedなのでhas(index)=false
      if (!leaderChars.has(buffer[cursor-1-back])) { return back; }
    }
    return maxOidashiDepth;
  }

  let lineSize = null;
  while (true) {
    const c = peek();
    if (c == null) { break; }

    if (cursor === 0) { 
      cursor = 1;
      continue;
    } else {
      const { size, wrap } = wrapDetector(buffer.slice(0, cursor+1));
      if (!wrap) { lineSize = size; cursor++; continue; }
    }

    // 折りたたみ
    if (wrapSize != null) { lineSize = wrapSize; }

    // 追い出し処理
    let back = countOidashi();
    if (back === 0) {
      // ぶら下げ処理
      for (let depth = 0 ; depth < maxBurasageDepth ; depth++) {
        const c = peek();
        if (!trailerChars.has(c)) { break; }
        cursor++;
      }
    } else {
      cursor -= back;
    }

    const text = buffer.splice(0, cursor).join(''); // + `(${back},${buffered})`;
    yield { index, text, size: lineSize, wrap: true };
    index += text.length;
    cursor = 0;
  }

  if (0 < buffer.length) {
    yield { index, text: buffer.join(''), size: lineSize, wrap: false }; 
  }
}

export function kinsoku(wrapDetector, wrapSize, ss) {
  let a = [];
  let startIndex = 0;
  for (let s of ss.split('\n')) {
    let i = 0;
    function getNext() {
      if (s.length <= i) { return null; }
      if (isEmojiAt(s, i)) { const c = getEmojiAt(s, i); i+=c.length; return c; }
      return s.charAt(i++);
    }
    a.push(...kinsokuGenerator(wrapDetector, wrapSize, getNext, startIndex));
    startIndex += s.length + 1;
  }
  return a;
}

export function isEmojiAt(str, index) {
  const codePoint = String.fromCodePoint(str.codePointAt(index));
  const regex = /\p{Emoji}/u;

  return regex.test(codePoint);
}

export function getEmojiAt(str, index) {
  let endIndex = index + 1;
  if (str.codePointAt(index) > 0xFFFF) {
      // This is a surrogate pair, so the emoji is 2 characters long
      endIndex++;
  }
  return str.slice(index, endIndex);
}

/*
const a = kinsoku(s=> {
  return ({ size: s.length, wrap: 5 < s.length })
}, 5, "♫⏯😥♫⏯");
*/
