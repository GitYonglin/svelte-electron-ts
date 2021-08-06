import { deviceLiveList } from "../store/device"
import { get } from "svelte/store";
import type { SWPLC } from "./socket-worker";

export function socketWrite(device: string, data: {
  fc: 'FC3'
  | 'FC5'
  | 'FC6'
  | 'FC15'
  | 'FC16Float'
  | 'FC16Int32', address: number, data: any, msg: string
}, priority: boolean) {
  return new Promise<any>(async (resolve, reject) => {
    const socket: SWPLC = get(deviceLiveList)[device];
    const msg = `${data.fc}_${data.msg}`;
    socket.otherData.push({[msg]: (d: any) => {resolve(d)}})
    socket.worker.postMessage({
      key: "write",
      data: { data, priority },
    });
  })
}
/**
 * 写入多个浮点数
 *
 * @param {string} device 设备名称
 * @param {number} address 写入首地址
 * @param {number} data 写入数据
 * @param {string} msg 返回信息名称
 * @param {boolean} priority 优先写入
 * @return {*} 
 */
export function FC3(device: string, address: number, data: number, priority: boolean = false) {
  return socketWrite(device, {
    fc: "FC3",
    address,
    data,
    msg: `${device}_${address}`,
  }, priority);
}
/**
 * 写入多个浮点数
 *
 * @param {string} device 设备名称
 * @param {number} address 写入首地址
 * @param {Array<number>} data 写入数据
 * @param {string} msg 返回信息名称
 * @param {boolean} priority 优先写入
 * @return {*} 
 */
export function FC16float(device: string, address: number, data: Array<number>, priority: boolean = false) {
  // console.log('FC16Float', device, address, data);

  return socketWrite(device, {
    fc: "FC16Float",
    address,
    data,
    msg: `${device}_${address}`,
  }, priority);
}
/**
 * 写入多个线圈
 *
 * @param {string} device 设备名称
 * @param {number} address 写入首地址
 * @param {Array<0|1>} data 写入数据
 * @param {string} msg 返回信息名称
 * @param {boolean} priority 优先写入
 * @return {*} 
 */
export function FC15(device: string, address: number, data: Array<0 | 1>, priority: boolean = false) {
  return socketWrite(device, {
    fc: "FC15",
    address: address + 2048,
    data: data.reverse(),
    msg: `${device}_${address}`,
  }, priority);
}
/**
 * 写入单个寄存器
 *
 * @param {string} device 设备名称
 * @param {number} address 写入首地址
 * @param {number} data 写入数据
 * @param {string} msg 返回信息名称
 * @param {boolean} priority 优先写入
 * @return {*} 
 */
export function FC6(device: string, address: number, data: number, priority: boolean = false) {
  return socketWrite(device, {
    fc: "FC6",
    address,
    data,
    msg: `${device}_${address}`,
  }, priority);
}
/**
 * 写入单个S
 *
 * @param {string} device 设备名称
 * @param {number} address 写入首地址
 * @param {Array<number>} data 写入数据
 * @param {string} msg 返回信息名称
 * @param {boolean} priority 优先写入
 * @return {*} 
 */
export function FC5S(device: string, address: number, data: 0 | 1, priority: boolean = false) {
  return socketWrite(device, {
    fc: "FC5",
    address,
    data,
    msg: `${device}_${address}`,
  }, priority);
}
/**
 * 写入单个M
 *
 * @param {string} device 设备名称
 * @param {number} address 写入首地址
 * @param {Array<number>} data 写入数据
 * @param {string} msg 返回信息名称
 * @param {boolean} priority 优先写入
 * @return {*} 
 */
export function FC5(device: string, address: number, data: 0 | 1, priority: boolean = false) {
  return socketWrite(device, {
    fc: "FC5",
    address: address + 2048,
    data,
    msg: `${device}_${address}`,
  }, priority);
}


// export {
//     FC16float,
//     FC15,
//     FC6
// }