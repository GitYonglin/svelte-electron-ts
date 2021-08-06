/*
 * @Author: your name
 * @Date: 2021-08-05 11:21:06
 * @LastEditTime: 2021-08-06 13:51:54
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sveltekit-electron-master\src\worker\socket-worket.ts
 */

import { deviceLiveList } from "../store/device";
import { Writable, writable } from "svelte/store";

/** socket worker PLC */
export class SWPLC {
  /** 连接数据 */
  connectionStr: any;
  /** 实时数据 */
  liveData: Writable<any>;
  /** 其它数据 */
  otherData = otherDataFunc();
  /** worker 进程 */
  worker: Worker;
  private linkDelay: number = 0;

  constructor(connectionStr: any) {
    this.liveData = writable<{
      /** 连接状态 */
      linkStart:boolean,
    }>()
    this.connectionStr = connectionStr;
    this.worker = new Worker("./worker/worker.js");
    this.post();
    console.log(this.worker)
  }

  post() {
    /** 上传通信时间 */
    let mst = new Date().getTime();
    this.worker.postMessage({ key: "connection", data: this.connectionStr });
    this.worker.onmessage = (e: { data: { msg: string; success: any; data: any; }; }) => {
      const msg = e.data.msg;
      switch (msg) {
        case "getLive": // 实时数据
          /** 本次通信时间 */
          const ms = new Date().getTime()
          this.linkDelay = ms - mst;
          mst = ms;
          this.getLiveCallback(e.data);
          break;
        case "reLink": // 重连
          this.reLinkCallback(e.data);
          break;
        case "connection": // 连接成功
          mst = new Date().getTime();
          deviceLiveList.push({[this.connectionStr.uuid]: this as SWPLC});
          break;

        default:
          this.otherCallback(e.data);
          break;
      }
    };
  }
  close() {
    this.worker.postMessage({ key: "close", data: this.connectionStr });
  }
  /** 实时数据返回处理 */
  private getLiveCallback(e: any) {
    // console.log("实时数据返回处理", e)
    this.liveData.set(this.linkDelay);
    const success = e.success;
    if (success) {

    } else {

    }
  }
  /** 重连数据返回处理 */
  private reLinkCallback(e: any) {
    console.log(this.connectionStr.uid, "重连数据返回处理", e)
  }
  /** 其它数据返回处理 */
  private otherCallback(e: any) {
    this.otherData.pop(e.msg, e.data);
  }
}

/** 其它数据处理的 store */
function otherDataFunc() {
  const { subscribe, update } = writable<{[porp: string]: Function}>({});
  return {
    subscribe,
    push: (callback: {[porp: string]: Function}) => update(n => {
      return {...n, ...callback};
    }),
    pop: (key: string, data: any) => update(n => {
      const callback = n[key];
      if (callback) {
        callback(data);
        delete n[key];
      }
      return n;
    }),
  }
}
