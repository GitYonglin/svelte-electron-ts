import type { ConnectionStr } from '../../../model/socket-Model';
// import { Socket } from "net";
import { returnData16 } from "../callpackData";
import { modbusCmd } from "../CMD";
// import net from "net";
const net = require("net")

class SocketTCP {
    client;
    connectionStr: ConnectionStr;
    sendCmd: Array<any>;
    /** 发送命令状态 */
    writeState: boolean;
    cmdType;
    /** 重连定时器 */
    reTime;
    /** 当前重连次数 */
    nowReLinkCount: number;
    /** 超时次数 */
    okLinkCount;
    /** 成功后获取错误次数 */
    reLinkOkCount;
    /** 错误状态  */
    closeState;
    /** 重连 */
    reState;
    /** 当前执行的命令 */
    nowCMD;
    /** 自动中连 */
    autoreLinkT;
    /** 取消连接  */
    clearLink;
    /** 请求返回 */
    callback: (data: any) => {};
    /** 连接成功返回 */
    connectCallback: (data: any) => any;
    /** 错误返回 */
    errorCallback: (data: any) => any;
    /** 重连返回 */
    reLink: (data: any) => any;

    constructor(connstr) {
        this.sendCmd = [];
        this.writeState = false;
        this.connectionStr = connstr;
        this.connectTCP(connstr);
        this.nowReLinkCount = 0;
        this.okLinkCount = 0;
        this.reLinkOkCount = 0;
    }

    connectTCP(connstr) {
        if (this.clearLink) {
            return;
        }
        // console.warn(connstr.uid, '执行连接');
        this.nowReLinkCount++;

        this.client = new net.Socket();
        if (connstr.mode === 'ascii') {
            this.client.setEncoding('utf8');
        } else if (connstr.mode === 'tcp') {
            this.client.setEncoding('hex');
        }
        this.client.setNoDelay(true);
        this.client.connect(connstr.port, connstr.ip);
        this.client.setTimeout(connstr.setTimeout);
        this.client.on('data', (data) => {

            this.pack(true, data);
        });
        this.client.on('timeout', (data) => {
            this.errorCallback('获取数据超时');
            //: 01 10 1204 0002 0400 1D42 74100
            console.warn('获取数据超时错误返回 =>', data, this.connectionStr.uid, this.nowCMD);
        });
        this.client.on('connect', (data) => {
            // console.error('12456789', this.client);
            this.reLinkOkCount++;
            this.callback = null;
            this.sendCmd = [];
            this.FC3(0, 2, rd => {
                this.okLinkCount++;
                if (this.connectCallback) {
                    this.nowReLinkCount = 0;
                    this.reLinkOkCount = 0;
                    this.connectCallback(data);
                }
            })
            // this.writeState = false;
        });
        this.client.on('error', (data) => {
            // console.warn('错误返回 =>', data);
            this.callback = null;
            this.sendCmd = [];
            this.errorCallback('发生错误');
        });
        this.client.on("close", (data) => {
            // console.warn('close返回', data, this.reLinkOkCount, this.reLinkOkCount < 10);
            // console.error(this.client);
            if (this.reLinkOkCount < 10) {
                if (data) {
                    this.client = null;
                    if (!this.autoreLinkT) {
                        // console.log("再请求一边", this.client);
                        this.reLink({ time: `1s后重连`, nowCount: this.nowReLinkCount, count: this.okLinkCount, okErrorCount: this.reLinkOkCount });
                        this.autoreLinkT = setTimeout(() => {
                            this.autoreLinkT = null;
                            this.reLink({ time: `正在重连...`, nowCount: this.nowReLinkCount, count: this.okLinkCount, okErrorCount: this.reLinkOkCount })
                            this.connectTCP(this.connectionStr);
                        }, 1000);
                    }
                } else {
                    this.client = null;
                    if (this.reState) {
                        this.reState = false;
                        this.reLink({ time: `${(this.connectionStr.toLinkTime / 1000).toFixed(0)}s后重连`, nowCount: this.nowReLinkCount, count: this.okLinkCount, okErrorCount: this.reLinkOkCount });
                        this.reTime = setTimeout(() => {
                            this.reLink({ time: `正后重连...`, nowCount: this.nowReLinkCount, count: this.okLinkCount, okErrorCount: this.reLinkOkCount })
                            this.connectTCP(this.connectionStr)
                        }, this.connectionStr.toLinkTime);
                    }
                }
            } else {
                this.clearLink = true;
                this.client.end();
                this.client.destroy();
                clearTimeout(this.autoreLinkT);
                clearTimeout(this.reTime);
                this.client = null;
                this.reLink({ time: `30s后重连`, nowCount: this.nowReLinkCount, count: this.okLinkCount, okErrorCount: this.reLinkOkCount });
                setTimeout(() => {
                    this.clearLink = false;
                    this.reLink({ time: `正后重连...`, nowCount: this.nowReLinkCount, count: this.okLinkCount, okErrorCount: this.reLinkOkCount })
                    this.connectTCP(this.connectionStr);
                }, 30000);
            }
        })
        // this.client = this.client;
    }

    /** 取消链接 */
    closeLink(re = false, stop = false) {

        this.client.end();
        this.client.destroy();
        // this.connectionStr = null;
        if (stop) {
            this.client = null;
            return;
        }
        this.callback = null;
        this.sendCmd = [];
        this.writeState = false;
        if (this.reTime) {
            clearTimeout(this.reTime);
        }
        this.reState = re;
    }
    /** 写入命令消息池 */
    writeComm(cmd, callback, priority) {
        if (this.client && this.client.writable) {
            if (!this.sendCmd.some(c => c.cmd === cmd)) {
                if (priority) {
                    this.sendCmd.push({ cmd, callback });
                } else {
                    this.sendCmd.unshift({ cmd, callback });
                }
            }
            if (!this.writeState && this.sendCmd.length > 0) {
                const c = this.sendCmd.pop();
                this.writeState = true;
                this.write(c.cmd, c.callback);
            }
        } else {
            console.error("连接错误");
        }

    }
    /** 执行命令 */
    write(cmd, callback, state = true) {
        if (this.client) {
            try {
                this.writeState = true;
                this.callback = callback;
                this.nowCMD = cmd;
                this.client.write(cmd);
                setTimeout(() => {
                }, 1);
            } catch (error) {
                console.error(error);
            }
        }
    }
    /** 返回请求数据 */
    pack(success, data) {
        const pg = { success, data: success ? returnData16(data, this.connectionStr.mode) : data };
        if (this.callback) {
            this.callback(pg);
        }
        this.callback = null;
        this.writeState = false;
        const cmd = this.sendCmd.pop();
        if (cmd) {
            this.write(cmd.cmd, cmd.callback);
        }

    }

    FC1(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 1, Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC2(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 2, Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC30(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 3, Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC3(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 3, 4096 + Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC5(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 5, Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    // FC5T(address, data, callback, priority = false) {
    //     const cmd = modbusCmd(1, 5, 1536 + Number(address), data, "int32", this.connectionStr.mode);
    //     this.writeComm(cmd, callback, priority);
    // }
    // FC5S(address, data, callback, priority = false) {
    //     const cmd = modbusCmd(1, 5, Number(address), data, "int32", this.connectionStr.mode);
    //     this.writeComm(cmd, callback, priority);
    // }
    FC6(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 6, 4096 + Number(address), data, "", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC15(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 15, Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC16Float(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 16, 4096 + Number(address), data, "float", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
    FC16Int32(address, data, callback, priority = false) {
        const cmd = modbusCmd(1, 16, 4096 + Number(address), data, "int32", this.connectionStr.mode);
        this.writeComm(cmd, callback, priority);
    }
}

export {
    SocketTCP
}
