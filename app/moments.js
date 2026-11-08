import flowerUrl from './avatar.jpg';
import ascendantUrl from './photos/valorant-ascendant-2026-10-30.jpg';
import afterRainSkyUrl from './photos/after-rain-sky-2026-11-04.jpg';
import sunshowerUrl from './photos/sunshower-2026-11-07.gif';
import sinkFishUrl from './photos/sink-fish-2026-10-23.gif';

// 按实际发生日期填写；年轮会自动排序，补写过去的内容不用手动调整位置。
export const MOMENTS = [
  {
    id: 'sunshower-2026-11-07',
    date: '2026-11-07',
    title: '太阳还在，雨已经下疯了',
    text: '谁家太阳雨下这么大！！！',
    tag: '日常',
    photos: [{ src: sunshowerUrl, alt: '太阳雨下在路边，路面溅起一片水花' }]
  },
  {
    id: 'after-rain-sky-2026-11-04',
    date: '2026-11-04',
    title: '雨后的天空',
    text: '今天雨后的天空，感觉挺不错，留在这里。',
    tag: '日常',
    photos: [{ src: afterRainSkyUrl, alt: '2026年11月4日，雨后的蓝天与白云，路边的树和行人' }]
  },
  {
    id: 'valorant-ascendant-2026-10-30',
    date: '2026-10-30',
    title: '无畏契约登上超凡',
    text: '这一天，无畏契约登上超凡一。',
    tag: '游戏',
    photos: [{ src: ascendantUrl, alt: '2026年10月30日，无畏契约晋升超凡一的段位截图' }]
  },
  {
    id: 'sink-fish-2026-10-23',
    date: '2026-10-23',
    title: '洗手池临时改行当鱼塘',
    text: '阳光照进洗手池，几条小鱼绕着排水口转圈。平时洗个手就走，这回倒想多看一会儿。',
    tag: '日常',
    photos: [{ src: sinkFishUrl, alt: '阳光下，几条橘色小鱼在白色洗手池里游动' }],
    credit: '张刀宋大王让小小codex写的配文'
  },
  {
    id: 'learning-guitar',
    date: '2026-09-29',
    title: '想弹会的一首歌',
    text: '最近在练吉他，想学会弹唱 h3R3 刘清云的《还是会想你》。现在还在慢慢练。',
    tag: '吉他',
    photos: []
  },
  {
    id: 'road-to-diamond',
    date: '2026-09-29',
    title: '还在冲钻石',
    text: '最近在冲无畏契约的钻石段位，不过打得挺菜，打着打着就有点迷茫。',
    tag: '游戏',
    photos: []
  },
  {
    id: 'a-space-to-play',
    date: '2026-09-29',
    title: '先做着玩',
    text: '还没想清楚为什么要做这个个人网站，就是想做着玩一下。先把喜欢的东西和折腾的过程放在这里。',
    tag: '折腾',
    photos: [{ src: flowerUrl, alt: '这个个人空间使用的花朵图像' }]
  }
];
