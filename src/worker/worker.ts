/*
 * @Author: your name
 * @Date: 2020-08-30 22:50:34
 * @LastEditTime: 2021-08-06 14:04:49
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sd-client\public\worker\worker.js
 */
// const SocketTCP = require("../../src/modbus/socket/socket");

import { SocketTCP } from "../../electron/modbus";
let liveT: number;
let tcpClient: SocketTCP;
addEventListener('message', (e) => {
    // console.log('work接收到的数据为:', e.data);
    switch (e.data.key) {
        case 'connection':
            createSocketTCP(e.data.data);
            break;
        case 'write':
            write(e.data.data);
            break;
        case 'close':
            console.error('关闭连接', e.data.data.uid);
            if (tcpClient) {
                tcpClient.closeLink(false, true);
                tcpClient = null;
            }
            break;
        default:
            break;
    }
});

postMessage("你好，我是worker发来的数据", null)

const alarmState = ['张拉',
    '回程',
    '卸荷',
    '压力上限',
    '压力未连接',
    '位移上限',
    '位移下限',
    '位移未连接',
    '超设置压力',
    '超设置位移',
    '模块错误',
    '急停',
    '自动暂停',
    '通信错误',
    '电机过载',
    'PLC停止'];

const autoState = [
    '等待保压',
    '卸荷完成',
    '回顶完成',
    '超工作位移上限',
    '平衡暂停',
    '压力差报警',
    '伸长量偏差报警',
    '张拉完成',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '停止'
];

function createSocketTCP(connStr: any) {
    tcpClient = new SocketTCP(connStr);
    tcpClient.connectCallback = (data) => {
        if (tcpClient?.client?.writable) {
            postMessage({ msg: 'connection', data: { success: true, data: '连接成功' } }, null)
            if (!liveT) {
                getLive('000000000000');
            } else {
                clearTimeout(liveT);
                getLive('123132');
            }
        }

    };
    /** 错误返回 */
    tcpClient.errorCallback = (data) => {
        postMessage({ msg: 'getLive', data: { success: false, data: '连接错误' } }, null);
        // console.error("返回了错误", data, connStr.uid, tcpClient, tcpClient.client.writable);
        tcpClient.closeLink(true);
    };
    /** 重连返回 */
    tcpClient.reLink = (data) => {
        // console.error(tcpClient.connectionStr.uid, "===重连数据返回", data);
        postMessage({ msg: 'reLink', data }, null);
        // tcpClient.closeLink(true);
    };
    function getLive(s: any = null) {
        if (!tcpClient.client) {
            console.error('没有连接');
            return;
        }
        /** 创建请求 */
        function createPromise(address: number, num: number) {
            return new Promise<{ float: Array<any>, int16: Array<any>, address: number }>((resolve, reject) => {
                const sendT = setTimeout(() => {
                    reject({ success: false, data: null, error: "请求超时" });
                }, 1000);
                tcpClient.FC3(address, num, (rd: any) => {
                    clearTimeout(sendT);
                    try {
                        rd.success ? resolve({ float: rd.data.float, int16: rd.data.int16, address }) : reject({ success: false, data: null });
                    } catch (error) {
                        reject({ success: false, data: null });
                    }
                })
            });
        }
        /** 执行请求 */
        Promise.all([createPromise(0, 20)]).then((t) => {
            // console.log(tcpClient.connectionStr.uid, t);
            const float = t[0].float;
            const int16 = t[0].int16;

            try {
                const asts = [getBitAlarm(int16[6], alarmState), getBitAlarm(int16[16], alarmState)];
                const rdData = ['A', 'B'].map((m, i) => {
                    const fi = i * 5;
                    const ii = i * 10;
                    const ast = asts[i];
                    return {
                        name: m,
                        mpa: (float[fi] || 0).toFixed(2),
                        mm: (float[fi + 2] || 0).toFixed(2),
                        setMpa: (float[fi + 4] || 0).toFixed(2),
                        setMm: 123.23,
                        Ystate: ast.y,
                        alarm: ast.a,
                        state: getBit(int16[ii + 7], autoState),
                        error: false,
                        time: new Date().getTime()
                    };
                })
                tcpClient.FC5(1536 + 99, 0, null);
                postMessage({ msg: 'getLive', success: true, data: rdData }, null);
            } catch (error) {
                console.error("数据解析错误", error);
                postMessage({ msg: 'getLive', success: false }, null);
            }
        }).catch((error) => {
            postMessage({ msg: 'getLive', success: false }, null);
        }).finally(() => {
            setTimeout(() => {
                if (tcpClient?.client?.writable) {
                    getLive();
                }
            }, connStr.liveDelay || 10);
        })
    }
    /** 报警数据处理 */
    function getBitAlarm(data: any, strs: any[]) {
        const rd: { a: Array<any>, y: Array<any> } = { a: [], y: [] };
        for (let index = 0; data !== 0 && index <= 15; index++) {
            if (data & 1) {
                index < 3 ? rd.y.push(strs[index]) : rd.a.push(strs[index]);
            }
            data = data >> 1;
        }
        return rd;
    }
    /** 位数据处理 */
    function getBit(data: number, strs: any[]) {
        const rd = [];
        for (let index = 0; data !== 0 && index <= 15; index++) {
            if (data & 1) {
                rd.push(strs[index]);
            }
            data = data >> 1;
        }
        return rd;
    }
}
/** 请求返回错误 */

/** 请求写入命令 */
function write(d: { data: any; priority: any; }) {
    const data = d.data;
    tcpClient[data.fc](data.address, data.data, (rd: any) => {
        postMessage({ msg: data.msg, data: rd }, null);
    }, d.priority);
}

