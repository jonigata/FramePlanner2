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
  let currentLine = '';  
  let buffered = '';

  function get() {
    if (0 < buffered.length) {
      const c = buffered[0];
      buffered = buffered.substring(1);
      return c;
    } else {
      return getNext();
    }
  }

  while (true) {
    const c = get();
    if (c == null) {
      yield currentLine;
      if (c == null) { break; }
    } else {
      const s = currentLine + c;
      if (!overflowDetector(s)) {
        currentLine = s;
      } else {
        // 持ち越し処理
        let length = currentLine.length;
        let back = 0;
        while (back < maxMochikoshiDepth && back < length - 1 &&
               gyoumatuKinsokuTable.has(currentLine[length - 1 - back])) {
          back++;
        }

        length -= back;
        buffered = currentLine.substring(length) + c + buffered;
        currentLine = currentLine.substring(0, length);

        // ぶら下げ処理
        if (back == 0) {
          let burasageDepth = maxBurasageDepth;
          while (0 < burasageDepth) {
            const c = get();
            if (c == null) {
              break;
            }
            if (!gyoutouKinsokuTable.has(c)) {
              buffered = c + buffered;
              break;
            }

            currentLine += c;
            burasageDepth--;
          }
        }
        yield currentLine; // + `(${back},${buffered})`;
        currentLine = "";
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
