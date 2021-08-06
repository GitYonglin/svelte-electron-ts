/*
 * @Author: your name
 * @Date: 2020-08-19 20:37:05
 * @LastEditTime: 2020-08-29 18:31:12
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sd-client\src\serial\index.js
 */
const SerialPort = require('serialport')
const Readline = require('@serialport/parser-readline')
const rdata = require("./callpackData");

class Serial {
    port;
    parser;
    sendCmd = [];
    /** 发送命令状态 */
    writeState = false;
    callpack;
    maincallpack;
    constructor() {
        console.log('serialport');
    }
    writeTime;
    /** 写入命令 */
    writeComm(cmd, callpack) {
        if (!this.sendCmd.some(c => c.cmd === cmd)) {
            this.sendCmd.unshift({ cmd, callpack });
        }
        if (!this.writeState && this.sendCmd.length > 0) {
            const c = this.sendCmd.pop();
            console.log('42424242', c);
            this.writeState = true;
            this.write(c.cmd, c.callpack);
        }
        console.log('CMDS', this.sendCmd);
        console.log('CMDSlength', this.sendCmd.length);
    }
    write(cmd, callpack) {
        console.time('statr');
        this.writeState = true;
        setTimeout(() => {
            this.callpack = callpack;
            console.log('43====', cmd);
            this.port.write(cmd, data => {
                console.log('45====', data);
            });
            this.writeTime = setTimeout(() => {
                this.pack(false, `${cmd}获取数据超时`);
            }, 150);
        }, 1);
    }
    /** 获取串口列表 */
    getLists() {
        const rel = SerialPort.list();
        return new Promise((resolve, reject) => {
            rel.then(data => {
                return resolve(data);
            });
        });
    }
    /** 创建串口 */
    createPort() {
        return new Promise((resolve, reject) => {
            if (!this.port) {
                try {
                    this.port = new SerialPort( //设置串口属性
                        "COM4", {
                        baudRate: 115200, //波特率
                        dataBits: 8, //数据位
                        parity: 'none', //奇偶校验
                        stopBits: 1, //停止位
                        flowControl: false,
                        autoOpen: false //不自动打开
                    }, false);
                    this.parser = new Readline();
                    this.port.open(data => {
                        console.log('85===', data);
                        if (data && data.toString().indexOf("Error") > -1) {
                            reject(data);
                        } else {
                            resolve(true)
                        }
                    });
                    this.port.pipe(this.parser)
                    this.parser.on('data', line => {
                        this.pack(true, line);
                    });
                    this.parser.on('error', err => {
                        console.log('85==>', err);
                    });
                } catch (error) {
                    reject("创建串口失败");
                    console.log('comm-error');
                }
            } else {
                resolve(true)
                console.log("prot already exist");
            }
        })
    }
    /** 返回请求数据 */
    pack(success, data) {
        const pg = { success, data: success ? rdata.returnData16(data, 'ascii') : data };
        console.log(`pack >> ${pg}`);
        if (this.callpack) {
            this.callpack(pg);
        }
        if (this.maincallpack) {
            this.maincallpack(pg);
        }
        this.callpack = null;
        console.timeEnd('statr');
        this.writeState = false;
        clearTimeout(this.writeTime);
        const cmd = this.sendCmd.pop();
        if (cmd) {
            this.write(cmd.cmd, cmd.callpack);
        }
    }
}
let serial;
/** 创建串口 */
function createSerialPort() {
    if (!serial) {
        console.log('new SerialPort');
        serial = new Serial();
        return serial;
    } else {
        console.log('return SerialPort');
        return serial;
    }
}

module.exports = {
    createSerialPort
}