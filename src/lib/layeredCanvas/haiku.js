const haiku = [
  "古池や\n蛙飛び込む\n水の音",
  "夏草や\n兵どもが\n夢の跡",
  "柿食えば\n鐘が鳴るなり\n法隆寺",
  "秋深き\n隣は何を\nする人ぞ",
  "朝顔に\nつるべとられて\nもらい水",
  "五月雨を\n集めてはやし\n最上川",
  "すずめの子\nそこのけそこのけ\nお馬が通る",
  "菜の花や\n月は東に\n日は西に",
  "目には青葉\nやまほととぎす\n初がつお",
  "やせ蛙\n負けるな一茶\nこれにあり",
  "閑さや\n岩にしみ入る\n蝉の声",
];

export function getHaiku() {
  return haiku[Math.floor(Math.random() * haiku.length)];
}
