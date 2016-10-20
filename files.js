/**
 * 文件操作集成
 */

var fs = require('fs');
var urlUtil = require('url');
var pathUtil = require("path");
var superagent = require('superagent');

var ini = require('./config/ini').ini;

var Url = function(){};
// Url是否合法
Url.prototype.isurl = function(url) {
    if (url.indexOf('javascript')>-1) {
        return false;
    }
    if (url.charAt(0)==='#') {
        return false;
    }
    if (url==='/') {
        return false;
    }
    return true;
}
/**
 * url地址修正处理
 * @param {string} url 来源Url
 * @param {string} url2 校正Url
 */
Url.prototype.handler = function(url,url2) {
    if(!url || !url2){
        return false;
    }
    var oUrl = urlUtil.parse(url);
    if(!oUrl["protocol"] || !oUrl["host"] || !oUrl["pathname"]){//无效的访问地址
        return false;
    }
    if(url2.substring(0,2) === "//"){
        url2 = oUrl["protocol"]+url2;
    }
    var oUrl2 = urlUtil.parse(url2);
    if(oUrl2["host"]){
        if(oUrl2["hash"]){
            delete oUrl2["hash"];
        }
        return urlUtil.format(oUrl2);
    }
    var pathname = oUrl["pathname"];
    if(pathname.indexOf('/') > -1){
        pathname = pathname.substring(0,pathname.lastIndexOf('/'));
    }
    if(url2.charAt(0) === '/'){
        pathname = '';
        url2 = url2.substring(1);
    }
    url2 = pathUtil.normalize(url2); //修正 ./ 和 ../
    url2 = url2.replace(/\\/g,'/');
    while(url2.indexOf("../") > -1){ //修正以../开头的路径
        pathname = pathUtil.dirname(pathname);
        url2 = url2.substring(3);
    }
    if(url2.indexOf('#') > -1){
        url2 = url2.substring(0,url2.lastIndexOf('#'));
    } else if(url2.indexOf('?') >　-1){
        url2 = url2.substring(0,url2.lastIndexOf('?'));
    }
    var oTmp = {
        "protocol": oUrl["protocol"],
        "host": oUrl["host"],
        "pathname": pathname + '/' + url2,
    };
    return urlUtil.format(oTmp);
}
exports.urlUtil = function() {
    return new Url();
}

/**
 * 文件处理
 */
var FileCmd = function(){
    if (!(this instanceof FileCmd)) {
        return FileCmd();
    }

    this.downloadDir = ini.downloadDir;
    if (this.downloadDir.lastIndexOf('/') != 0) {
        this.downloadDir += '/';
    }
    this.urlUtil = new Url();
    if (!fs.existsSync(this.downloadDir)) {
        fs.mkdirSync(this.downloadDir);
    }
};

/**
 * 检查文件是否存在
 * @param {string} pathname 路径名称
 */
FileCmd.prototype.hasPath = function(pathname) {
    pathname = this.downloadDir + pathname;
    return fs.existsSync(pathname);
}

/**
 * 本地路径信息分析
 * @param {string}   pathname 要分析的本地路径
 * @param {boolean}  create   是否新建对应路径[仅限路径,如果启用,需要添加回调函数]
 * @param {function} callback 回调函数(回调路径状态)
 */
FileCmd.prototype.pathHandel = function(pathname,create,callback) {

    var pathstatus = {};
    var createPath = [];

    pathstatus.step = 0;

    if (fs.existsSync(pathname)) {
        // 第一次检查成功返回
        pathstatus.hasPath = true;
        if (create) {
            callback(pathstatus)
        } else {
            return pathstatus;
        }
        return;
    }
    var path_num = 0;
    var pathname2 = pathname;
    pathstatus.path_parse = {};

    do {
        // 路径拆分
        var uPathname = pathUtil.parse(pathname2);
        pathstatus.file = !(!uPathname.ext);
        pathname2 = uPathname.dir;

        pathstatus.path_parse[path_num] = uPathname.name;

        if (fs.existsSync(pathname2)&&pathstatus.step==0) {
            // 第二次检查成功返回
            pathstatus.step++;
            pathstatus.hasPath = true;
            if (create) {
                callback(pathstatus)
            } else {
                return pathstatus;
            }
        }

        if (fs.existsSync(pathname2)) {
            pathstatus.step++;
            pathstatus.truePath = pathname2;
            pathname2 = '';
        }

        if (!uPathname.ext.length) {
            createPath.push(uPathname.name);
        }

        path_num++;
    } while (pathname2!='');

    var that = this;
    function mkDirFun(names) {
        var data = that.mkDirSync(names,'');
        if (!data) {
            console.log('创建目录出错');
            console.log('错误路径:'+names);
            console.log('传递路径:'+pathname);
        } else {
            createPath.pop();
            if (createPath.length) {
                mkDirFun(names+createPath[createPath.length-1]+'/');
            } else {
                pathstatus.infos = '创建目录成功';
                callback(pathstatus);
            }
        }
    }

    if (createPath.length) {
        mkDirFun(createPath[createPath.length-1]+'/');
    }
}

/**
 * 异步创建 -- 创建文件夹
 * @param {string} pathname 路径名称
 * @param {string} prefix 路径前缀
 */
FileCmd.prototype.mkDir = function(pathname,prefix,callback) {
    if (!pathname || (typeof pathname) !== 'string') {
        console.log(pathname+'不正确的路径名');
        callback(false);
        return;
    }
    if (!this.hasPath2(pathname)) {
        prefix = this.downloadDir + prefix;
        fs.mkdir(prefix+pathname,function(err){
            if (err) {
                console.log('创建目录失败');
                callback(false);
                return;
            } else {
                callback(prefix+pathname);
            }
        });
    } else {
        console.log('目录已经存在');
    }
}

/**
 * 创建同步 -- 创建文件夹
 * @param {string} pathname 路径名称
 * @param {string} prefix 路径前缀
 * @return {string} 创建后的完整路径
 */
FileCmd.prototype.mkDirSync = function(pathname,prefix) {
    if (!pathname || (typeof pathname) !=='string') {
        return false;
    }
    if (!this.hasPath(pathname,prefix)) {
        prefix = this.downloadDir + prefix;
        fs.mkdirSync(prefix+pathname);
    }
    return prefix+pathname;
}

/**
 * 文件信息读取
 */
FileCmd.prototype.fileinfo = function(res) {
    var fileinfo = {};
    fileinfo.name = pathUtil.parse(res.req.path).name;
    fileinfo.suf = pathUtil.parse(res.req.path).ext;
    if (res.type) {
        fileinfo.mime = res.type;
        fileinfo.type = res.type.split('/')[0];
    } else {
        fileinfo.mime = res.header['content-type'];
        fileinfo.type = res.header['content-type'].split('/')[0];
    }
    fileinfo.size = res.header['content-length'];
    return fileinfo;
}

/**
 * 下载文件
 * @param {string}   url      下载地址
 * @param {string}   savepath 保存路径
 * @param {string}   savename 保存名称
 * @param {function} callback 回调函数
 */
FileCmd.prototype.download = function(url,savepath,callback) {
    if (!this.urlUtil.isurl(url)) {
        var status = false;
        callback(status);
        return;
    }
    var oUrl = urlUtil.parse(url);
    if (!oUrl['protocol'] || !oUrl['pathname']) {
        var status = false;
        callback(status);
        return;
    }
    var that = this;
    superagent
        .get(url)
        .set("User-Agent",ini.ua)
        .end(function(err,res){
            if (err) {
                console.log(['下载出错:error',url]);
                var status = false;
                callback(status);
                return;
            }
            if (res.status!='200'&&res.status!='304'&&res.status!='301'&&res.status!='302') {
                console.log(['下载出错:status',url]);
                var status = false;
                callback(status);
                return;
            }
            var fileinfo = that.fileinfo(res);
			if (savename) {
				fileinfo.name = savename;
			}
            that.pathHandel(savepath,true,function(data){
                var savefile = savepath + fileinfo.name + fileinfo.suf;
                if (that.hasPath(savefile)) {
                    savefile = savepath + fileinfo.name + '_' + (new Date).getTime() + fileinfo.suf;
                }
                fs.writeFile(savefile,res.body,function(err){
                    if (err) {
                        console.log(err);
                        var status = false;
                        callback(status);
                    } else {
                        callback([savefile,fileinfo.size]);
                    }
                });
            });
        });
}

/**
 * 保存文本文件
 * @param {string}   type     覆盖或叠加 '0':'a' || '1':'w'
 * @param {string}   content  保存内容
 * @param {string}   savepath 保存路径
 * @param {function} callback 回调函数
 */
FileCmd.prototype.savetext = function(type,content,savepath,callback) {
    var openfile_num=0;
    this.pathHandel(savepath,true,function(data){
        if (type=='0') {
            type = 'a';
        } else {
            type = 'w';
        }
        fs.writeFile(savepath,content,{flag:type},function(err){
            openfile_num++;
            if (err) {
                if (openfile_num>1) {
                    callback(false,'无法编辑'+savepath+'内容');
                    console.log('无法编辑'+savepath+'内容');
                    console.log(err);
                }
            } else {
                callback(true,'处理完成');
            }
        });
    });
}

exports.files = new FileCmd();
