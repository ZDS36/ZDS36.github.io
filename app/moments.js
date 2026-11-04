import flowerUrl from './avatar.jpg';
import ascendantUrl from './photos/valorant-ascendant-2026-10-30.jpg';

// 按实际发生日期填写；年轮会自动排序，补写过去的内容不用手动调整位置。
export const MOMENTS = [
  {
    id: 'valorant-ascendant-2026-10-30',
    date: '2026-10-30',
    title: '无畏契约登上超凡',
    text: '这一天，无畏契约登上超凡一。',
    tag: '游戏',
    photos: [{ src: ascendantUrl, alt: '2026年10月30日，无畏契约晋升超凡一的段位截图' }]
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
