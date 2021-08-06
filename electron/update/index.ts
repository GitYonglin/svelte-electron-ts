/*
 * @Author: your name
 * @Date: 2020-10-21 09:02:06
 * @LastEditTime: 2021-08-06 16:39:39
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \s-zl-client\src\electron\update\index.ts
 */
import { autoUpdater } from 'electron-updater';

// 更新
function update() {
    console.log('update');
    // 执行自动更新检查
    autoUpdater.checkForUpdates();
}
// 下载
function downloadApp() {
    autoUpdater.downloadUpdate();
}

// 检测更新，在你想要检查更新的时候执行，renderer事件触发后的操作自行编写
function updateHandle(callback) {
    autoUpdater.autoDownload = false;
    // http://localhost:5500/up/ 更新文件所在服务器地址
    autoUpdater.setFeedURL('http://47.107.59.12:8089/upDateApp/zl');
    /** 获取更新错误 */
    autoUpdater.on('error', (info) => {
        callback({ msg: 'error', info });
    });
    /** 正在检测更新 */
    autoUpdater.on('checking-for-update', (info) => {
        callback({ msg: 'checking', r: info });
    });
    /** 获取更新内容 */
    autoUpdater.on('update-available', (info) => {
        callback({ msg: 'updateAva', info });
    });
    /**  */
    autoUpdater.on('update-not-available', (info) => {
        callback({ msg: 'updateNotAva', info });
    });

    // 更新下载进度事件
    autoUpdater.on('download-progress', (info) => {
        callback({ msg: 'download-progress', info });
    });
    // 下载完成事件
    autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateUrl, quitAndUpdate) => {
        callback({ msg: 'download-success' });
    });
}
/** 安装软件 */
function installApp() {
    // 关闭程序安装新的软件
    autoUpdater.quitAndInstall();
}
/** Linux安装软件 */
function LinuxInstallApp(filePath, callback) {
    const exec = require('child_process').exec;
    const { app } = require('electron');
    callback(1);
    exec(`echo "." | sudo -S dpkg -i ${filePath}`, (error, stdout, stderr) => {
        console.log(error);
        console.log(stdout);
        console.log(stderr);
        // app.quit();
        // app.relaunch();
        if (!error) {
            callback(2);
            reboot();
        } else {
            callback(3);
        }
    });
    // return new Promise((resolve, reject) => {
    // });
}
/**
 *  获取UPan 文件
 */
let upanPath;
let rUpanData = { state: null, msg: null, appFiles: null, tmpFiles: null, uploadServiceFiles: null };
function getUpDataFile(callpack) {
    const exec = require('child_process').exec;

    exec(`ls /dev/sd[b-z][1-9]`, (error, stdout, stderr) => {
        // console.log('dev', error);
        // console.log('dev', stdout);
        // console.log('dev', stderr);
        if (!error && stdout) {
            upanPath = stdout.split('\n')[0].replace('/dev', '/mnt');
        }
        if (!error) {
            Promise.all([
                lsFiles(`ls /mnt/sd[b-z][1-9]/*.zlapp`),
                lsFiles(`ls /mnt/sd[b-z][1-9]/zlexport/*.zltmp`),
                lsFiles(`ls /mnt/sd[b-z][1-9]/zlupload/*.zlupload`)
            ]).then(r => {
                toCallpack({ state: true, msg: '检测到U盘', appFiles: r[0], tmpFiles: r[1], uploadServiceFiles: r[2] });
            });
        } else {
            toCallpack({ state: false, msg: '未发现U盘' });
        }
    })
    /** 文件查询 */
    function lsFiles(cmd: string) {
        return new Promise((resolve, reject) => {
            exec(cmd, (error, stdout, stderr) => {
                const files = [];
                if (!error && stdout) {
                    stdout.split('\n').map(path => {
                        if (path) {
                            files.push({ value: path, title: path.match(/[^/]+(?!.*\/)/)[0] });
                        }
                    })
                }
                resolve(files);
            })
        })
    }
    function toCallpack(d) {
        if (JSON.stringify(d) !== JSON.stringify(rUpanData)) {
            rUpanData = JSON.parse(JSON.stringify(d));
            callpack(rUpanData);
            console.log('有变化');
        } else {
            callpack(null);
            // console.log('没有变化');
        }
    }
}

/**
 * 远程下载更新文件
 */
function downloadFile(configuration) {
    const request = require('request');
    const fs = require('fs');
    const path = require('path');
    return new Promise((resolve, reject) => {
        // Save variable to know progress
        var received_bytes = 0;
        var total_bytes = 0;
        var req = request({
            method: 'GET', uri: configuration.remoteFile
        });

        var dirPath = path.join('/tmp', "Download");
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath);
            console.log("文件夹创建成功==", dirPath);
        } else {
            console.log("文件夹已存在==", dirPath);
        }

        const filePath = path.join(dirPath, configuration.localFile);
        var out = fs.createWriteStream(filePath);
        req.pipe(out);
        req.on('response', function (data) {
            total_bytes = parseInt(data.headers['content-length']);
        });

        // Get progress if callback exists
        if (configuration.hasOwnProperty("onProgress")) {
            req.on('data', function (chunk) {
                // Update the received bytes
                received_bytes += chunk.length;
                configuration.onProgress(received_bytes, total_bytes);
            });
        } else {
            req.on('data', function (chunk) {
                // Update the received bytes
                received_bytes += chunk.length;
            });
        }
        req.on('end', function () {
            resolve(filePath);
        });
    });

}
/** 重启设备 */
function reboot() {
    const exec = require('child_process').exec;
    exec(`echo "." | sudo -S reboot`, (error, stdout, stderr) => {
        console.log(error);
        console.log(stdout);
        console.log(stderr);
    });
}
/** 关闭设备 */
function sotp() {
    const exec = require('child_process').exec;
    exec(`echo "." | sudo -S shutdown -h now`, (error, stdout, stderr) => {
        console.log(error);
        console.log(stdout);
        console.log(stderr);
    });
}

/**
 * 复制文件
 *
 * @param {*} source 源文件地址
 * @param {*} to 复制到地址
 * @return {*} 
 */
function copyUploadFile(source, oldFilePtah) {
    const fs = require('fs');
    const path = require('path');
    return new Promise(resolve => {
        const userPath =
            process.env[process.platform === "linux" ? "HOME" : "HOMEPATH"];
        const dirPath = path.join(userPath, "lq-bl-app", "UploadFile");
        console.log(dirPath);
        new Promise((resolve2, reject) => {
            if (!fs.existsSync(dirPath)) {
                fs.mkdir(dirPath, { recursive: true }, () => {
                    console.log("dir create ==", dirPath);
                    resolve2(true);
                });
            } else {
                console.log("dir exists ==", dirPath);
                resolve2(true);
            }
        }).then(() => {
            if (oldFilePtah && fs.existsSync(oldFilePtah)) {
                fs.unlink('oldFilePtah', (err) => {
                    if (err) throw err;
                    console.log(oldFilePtah, ' file deleted');
                });
            }
            const toFileName = `${new Date().getTime()}${path.basename(source, '.zlupload')}.js`
            const to = path.join(dirPath, toFileName);
            console.log('复制到', to);

            let read = fs.createReadStream(source);
            let write = fs.createWriteStream(to);
            write.on('error', err => {
                throw err;
            });
            write.on('finish', () => {
                resolve(toFileName);
            });
            read.pipe(write);
        })
    });
}

/** U盘监控 */
function upanMount(callpack) {
    getUpDataFile((d) => {
        setTimeout(() => {
            // console.log('U盘监控');
            callpack(d);
            upanMount(callpack);
        }, 1500);
    });
}

/** u盘移除 */
function umount(callpack) {
    const exec = require('child_process').exec;
    exec(`ls /dev/sd[b-z][1-9]`, (error, stdout, stderr) => {
        // console.log('error', error);
        // console.log('stderr', stderr);
        if (stdout) {
            let count = 0;
            const mo = stdout.split('\n');
            mo.pop();
            // console.log('stdout', mo);
            mo.map(m => {
                console.log('m=>>', m);
                exec(`echo "." | sudo -S systemd-umount -u ${m}`, (error, stdout, stderr) => {
                    // console.log(error);
                    // console.log(stdout);
                    // console.log(stderr);
                    count++;
                });
            })
            if (count === mo.length - 1) {
                callpack(true);
            }
        }

    })
}
/** 创建文件夹 */
function mkdir(dirName, rpath = null) {
    return new Promise((resolve, reject) => {
        const fs = require('fs');
        const path = require('path');
        const userPath =
            process.env[process.platform === "linux" ? "HOME" : "HOMEPATH"];
        let dirPath = path.join(userPath, "lq-bl-app", dirName);
        if (rpath) {
            dirPath = path.join(rpath, dirName);
        }
        if (!fs.existsSync(dirPath)) {
            fs.mkdir(dirPath, { recursive: true }, () => {
                console.log("dir create ==", dirPath);
                resolve(dirPath);
            });
        } else {
            console.log("dir exists ==", dirPath);
            resolve(dirPath);
        }
    })
}
/** 写入文件  */
function outData(fileName, str, callback) {
    try {
        const fs = require('fs');
        const path = require('path');
        console.log(fileName);
        mkdir('outData', upanPath).then(r => {
            const dirpath = path.join(r, fileName);
            console.log(dirpath);

            fs.writeFileSync(path.join(dirpath), str);
            callback(true)
        });
    } catch (error) {
        callback(false)
    }
}
const updateApp = {
    update,
    downloadApp,
    updateHandle,
    installApp,
    downloadFile,
    LinuxInstallApp,
    getUpDataFile,
    reboot,
    sotp,
    copyUploadFile,
    upanMount,
    umount,
    mkdir,
    outData
}
export { updateApp };
