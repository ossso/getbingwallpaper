/**
 * @param {number} n 抓取数量
 * @param {number} idx 抓取时间 至多向前推迟16天 向后获取明天
 * @param {string} downloadDir 下载目录
 * @param {string} ua 模拟UA
 */

exports.ini = {
    'bingUrl': 'http://cn.bing.com/HPImageArchive.aspx?format=js&',
    'params': {
        'n': 8,
        'idx': 16
    },
    'downloadDir': 'wallpaper',
    'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.143 Safari/537.36'
};
