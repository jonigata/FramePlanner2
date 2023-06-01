function makeTable(chars) {
  return new Set(chars.trim().replace(/\n/g, "").split(''));
}

const leaderTable = makeTable(`
、。，．・：；？！ー”）〕］｝〉》」』】
ヽヾゝゞ々
ぁぃぅぇぉっゃゅょゎ
ァィゥェォッャュョヮ
,.:;?!-\" ')]}
`);

const trailerTable = makeTable(`
‘“（〔［｛〈《「『【
([{
`);

const maxBurasageDepth = 2;
const maxOidashiDepth = 2;

function* kinsokuGenerator(overflowDetector, getNext) {
  let currentLine = [];  
  let buffered = [];

  const get = () => buffered.shift() ?? getNext();

  while (true) {
    const c = get();
    if (c == null) { 
      if (currentLine.length > 0) {
        yield currentLine.join(''); 
      }
      break;
    }

    currentLine.push(c);
    if (!overflowDetector(currentLine)) { continue; }

    // 折りたたみ

    // 追い出し処理
    buffered.unshift(currentLine.pop());
    let back = 0;
    while (back < maxOidashiDepth && 
           trailerTable.has(currentLine.at(-back-1))) {
      back++;
    }

    if (back === 0) {
      // ぶら下げ処理
      for (let depth = 0 ; depth < maxBurasageDepth ; depth++) {
        const c = get();
        if (c == null) { break; }
        if (!leaderTable.has(c)) { buffered.unshift(c); break; }
        currentLine.push(c);
      }
    } else {
      buffered.unshift(...currentLine.splice(-back));
    }

    yield currentLine.join(''); // + `(${back},${buffered})`;
    currentLine = [];
  }
}

export function kinsoku(overflowDetector, ss) {
  let a = [];
  for (let s of ss.split('\n')) {
    let i = 0;
    const getNext = () => i < s.length ? s[i++] : null;
    a.push(...kinsokuGenerator(overflowDetector, getNext));
  }
  return a;
}
