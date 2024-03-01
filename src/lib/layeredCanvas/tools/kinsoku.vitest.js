import { describe, it, expect } from "vitest"
import { kinsoku } from "./kinsoku"

const exampleSentences = {
  "彼女は元気に挨拶した。「こんにちは！」｛長い間会っていなかった友人に｝": 
  [
    { index: 0, text: '彼女は元気', size: 5, wrap: true },
    { index: 5, text: 'に挨拶した。', size: 5, wrap: true },
    { index: 11, text: '「こんにち', size: 5, wrap: true },
    { index: 16, text: 'は！」｛長', size: 5, wrap: true },
    { index: 21, text: 'い間会って', size: 5, wrap: true },
    { index: 26, text: 'いなかった', size: 5, wrap: true },
    { index: 31, text: '友人に｝', size: 4, wrap: false }
  ],
  "インターネットを開いて\n最新のニュースを見た｛彼は驚いた表情で｝":
  [
    { index: 0, text: 'インターネッ', size: 5, wrap: true },
    { index: 6, text: 'トを開いて', size: 5, wrap: false },
    { index: 12, text: '最新のニュー', size: 5, wrap: true },
    { index: 18, text: 'スを見た', size: 5, wrap: true },
    { index: 22, text: '｛彼は驚い', size: 5, wrap: true },
    { index: 27, text: 'た表情で｝', size: 5, wrap: false }
  ],
  "彼はパーティーに参加（「なぜ？」）することを楽しみにしている。｛友人たちと一緒に｝":
  [
    { index: 0, text: '彼はパーティー', size: 5, wrap: true },
    { index: 7, text: 'に参加', size: 5, wrap: true },
    { index: 10, text: '（「なぜ？」）', size: 5, wrap: true },
    { index: 17, text: 'することを', size: 5, wrap: true },
    { index: 22, text: '楽しみにし', size: 5, wrap: true },
    { index: 27, text: 'ている。', size: 5, wrap: true },
    { index: 31, text: '｛友人たち', size: 5, wrap: true },
    { index: 36, text: 'と一緒に｝', size: 5, wrap: false }
  ],
  "驚きと喜びが入り混じるニュースを聞いて、\n彼は目を丸くした。「本当に！？」":
  [
    { index: 0, text: '驚きと喜び', size: 5, wrap: true },
    { index: 5, text: 'が入り混じ', size: 5, wrap: true },
    { index: 10, text: 'るニュース', size: 5, wrap: true },
    { index: 15, text: 'を聞いて、', size: 5, wrap: false },
    { index: 21, text: '彼は目を丸', size: 5, wrap: true },
    { index: 26, text: 'くした。', size: 5, wrap: true },
    { index: 30, text: '「本当に！？」', size: 5, wrap: true }
  ],
  "彼が尋ねた。「これはどう使うのかな？」｛興味津々な顔で｝":
  [
    { index: 0, text: '彼が尋ねた。', size: 5, wrap: true },
    { index: 6, text: '「これはど', size: 5, wrap: true },
    { index: 11, text: 'う使うのか', size: 5, wrap: true },
    { index: 16, text: 'な？」｛興', size: 5, wrap: true },
    { index: 21, text: '味津々な顔', size: 5, wrap: true },
    { index: 26, text: 'で｝', size: 2, wrap: false }
  ],
  "雨が降ってきて、彼女はびしょ\n濡れになった。「なんてこった！」":
  [
    { index: 0, text: '雨が降って', size: 5, wrap: true },
    { index: 5, text: 'きて、彼女', size: 5, wrap: true },
    { index: 10, text: 'はびしょ', size: 4, wrap: false },
    { index: 15, text: '濡れになっ', size: 5, wrap: true },
    { index: 20, text: 'た。「なん', size: 5, wrap: true },
    { index: 25, text: 'てこった！」', size: 5, wrap: true }
  ],
  "サッカーチームは\n必勝を信じ、練習に励んでいる。「優勝するぞ！」と監督が叫んだ。":
  [
    { index: 0, text: 'サッカーチー', size: 5, wrap: true },
    { index: 6, text: 'ムは', size: 2, wrap: false },
    { index: 9, text: '必勝を信じ、', size: 5, wrap: true },
    { index: 15, text: '練習に励ん', size: 5, wrap: true },
    { index: 20, text: 'でいる。', size: 5, wrap: true },
    { index: 24, text: '「優勝する', size: 5, wrap: true },
    { index: 29, text: 'ぞ！」と監', size: 5, wrap: true },
    { index: 34, text: '督が叫んだ。', size: 5, wrap: true }
  ],
  "彼は敵を巧妙な動きで翻弄した。「こんなに速くて強いのか！」":
  [
    { index: 0, text: '彼は敵を巧', size: 5, wrap: true },
    { index: 5, text: '妙な動きで', size: 5, wrap: true },
    { index: 10, text: '翻弄した。', size: 5, wrap: true },
    { index: 15, text: '「こんなに', size: 5, wrap: true },
    { index: 20, text: '速くて強い', size: 5, wrap: true },
    { index: 25, text: 'のか！」', size: 4, wrap: false }
  ],
  "友人たちは言った。「おめでとう！成功を祝福するよ」":
  [
    { index: 0, text: '友人たちは', size: 5, wrap: true },
    { index: 5, text: '言った。', size: 5, wrap: true },
    { index: 9, text: '「おめでと', size: 5, wrap: true },
    { index: 14, text: 'う！成功を', size: 5, wrap: true },
    { index: 19, text: '祝福するよ」', size: 5, wrap: true }
  ],
  "彼の言葉には深い感動が込められていた。「君がここにいてくれて本当に嬉しい」":
  [
    { index: 0, text: '彼の言葉に', size: 5, wrap: true },
    { index: 5, text: 'は深い感動', size: 5, wrap: true },
    { index: 10, text: 'が込められ', size: 5, wrap: true },
    { index: 15, text: 'ていた。', size: 5, wrap: true },
    { index: 19, text: '「君がここ', size: 5, wrap: true },
    { index: 24, text: 'にいてくれ', size: 5, wrap: true },
    { index: 29, text: 'て本当に嬉', size: 5, wrap: true },
    { index: 34, text: 'しい」', size: 3, wrap: false }
  ],
  "たぬき":
  [
    { index: 0, text: 'たぬき', size: 3, wrap: false }
  ],
  "たぬ":
  [
    { index: 0, text: 'たぬ', size: 2, wrap: false }
  ],
  "た":
  [
    { index: 0, text: 'た', size: 1, wrap: false }
  ],
};

describe('禁則処理', () => {
  it('禁則処理', () => {
    Object.entries(exampleSentences).forEach(([k, v]) => {
      const a = kinsoku(s => ({ size: s.length, wrap: 5 < s.length }), 5, k);
      expect(a).toStrictEqual(v);
    });
    expect(kinsoku(s=> ({ size: s.length, wrap: 1 < s.length }), 1, "「")).toStrictEqual([{ index: 0, text: '「', wrap: false, size: 1 }]);
  });
});