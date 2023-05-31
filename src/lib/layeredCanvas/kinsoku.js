function makeTable(chars) {
  return new Set(chars.trim().replace(/\n/g, "").split(''));
}

const gyoutouKinsokuTable = makeTable(`
、。，．・：；？！ー”）〕］｝〉》」』】
ヽヾゝゞ々
ぁぃぅぇぉっゃゅょゎ
ァィゥェォッャュョヮ
,.:;?!-\" ')]}
`);

const gyoumatuKinsokuTable = makeTable(`
‘“（〔［｛〈《「『【
([{
`);

const maxBurasageDepth = 2;
const maxMochikoshiDepth = 2;

function* kinsokuGenerator(overflowDetector, getNext) {
  let currentLine = [];  
  let buffered = [];

  const get = () => buffered.shift() ?? getNext();

  while (true) {
    const c = get();
    if (c == null) {
      yield currentLine.join('');
      break;
    } else {
      currentLine.push(c);
      if (!overflowDetector(currentLine)) {
        // do nothing
      } else {
        // 持ち越し処理
        currentLine.pop();
        const a = currentLine.slice(-maxMochikoshiDepth).reverse();
        const back = Math.max(0, a.findIndex(c => !gyoutouKinsokuTable.has(c)));

        const oldLength = currentLine.length;
        const length = oldLength - back;

        buffered = [...currentLine.splice(length), c, ...buffered];

        // ぶら下げ処理
        if (back === 0) {
          for (let depth = 0 ; depth < maxBurasageDepth ; depth++) {
            const c = get();
            if (c == null) { break; }
            if (!gyoutouKinsokuTable.has(c)) {
              buffered.unshift(c);
              break;
            }

            currentLine.push(c);
          }
        }
        yield currentLine.join(''); // + `(${back},${buffered})`;
        currentLine = [];
      }
    }
  }
}

export function kinsoku(overflowDetector, ss) {
  let a = [];
  for (let s of ss.split('\n')) {
    let i = 0;
    const getNext = () => i < s.length ? s[i++] : null;
    a = a.concat(Array.from(kinsokuGenerator(overflowDetector, getNext)));
  }
  return a;
}

/*
const exampleSentences = [
  "彼女は元気に挨拶した。「こんにちは！」｛長い間会っていなかった友人に｝",
  "インターネットを開いて最新のニュースを見た｛彼は驚いた表情で｝",
  "彼はパーティーに参加することを楽しみにしている。｛友人たちと一緒に｝",
  "驚きと喜びが入り混じるニュースを聞いて、\n彼は目を丸くした。「本当に！？」",
  "彼が尋ねた。「これはどう使うのかな？」｛興味津々な顔で｝",
  "雨が降ってきて、彼女はびしょ\n濡れになった。「なんてこった！」",
  "サッカーチームは\n必勝を信じ、練習に励んでいる。「優勝するぞ！」と監督が叫んだ。",
  "彼は敵を巧妙な動きで翻弄した。「こんなに速くて強いのか！」",
  "友人たちは言った。「おめでとう！成功を祝福するよ」",
  "彼の言葉には深い感動が込められていた。「君がここにいてくれて本当に嬉しい」",
];

exampleSentences.forEach((s) => {
  console.log(s);
  console.log(kinsoku((s) => 5 < s.length, s));
});
*/

