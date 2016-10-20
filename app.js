var superagent = require('superagent');
var files = require('./files').files;
var ini = require('./config/ini').ini;

var GetWallpaper = function() {
    this.data = {};
    this.down = [];
};

/**
 * 代理访问处理函数
 */
GetWallpaper.prototype.uAgent = function(link,callback) {
    superagent
        .get(link)
        .set("User-Agent",ini.ua)
    .end(function(err,data){
        if (err) {
            console.log(['访问出错',link]);
            callback(false);
            return;
        }
        if (data.statusCode=='200') {
            callback(true,data.text);
        }
    });
    return this;
};

/**
 * 启动
 */
GetWallpaper.prototype.start = function() {
    var _this = this;
    var _param = [];
    for (var i in ini.params) {
        _param.push(i+'='+ini.params[i]);
    }
    var _url = ini.bingUrl + _param.join('&');
    console.log('访问地址:'+_url);
    this.uAgent(_url,function(status,content) {
        if (status) {
            if (content.indexOf('null') == 0) {
                console.log('bing参数不对');
                return _this;
            }
            _this.data.json = JSON.parse(content);
            _this.format();
        } else {
            console.log('访问停止');
        }
    })
    return this;
};

/**
 * 格式化数据
 */
GetWallpaper.prototype.format = function() {
    var list = this.data.json.images;
    for (var i = 0, n = list.length; i < n; i++) {
        var _item = {
            'url': list[i].url,
            'date': list[i].enddate,
            'status': true
        };
        this.down.push(_item);
    }
    this.download();
    return this;
};

/**
 * 下载
 */
GetWallpaper.prototype.download = function() {
    var nums = this.down.length;
    var num = 0;
    var savepath = files.downloadDir;
    var _this = this;
    // 下载1秒延迟
    setTimeout(function() {
        files.download(_this.down[num].url,savepath,_this.down[num].enddate,function(data) {
            if (!data) {
                console.log('下载失败...');
            } else {
                console.log('下载成功'+data[0]+' size:'+data[1]);
            }
        });
        num++;
        if (num < nums) {
            setTimeout(arguments.callee,1000);
        }
    },3000);
    return this;
};

var getWallpaper = new GetWallpaper();

getWallpaper.start();
