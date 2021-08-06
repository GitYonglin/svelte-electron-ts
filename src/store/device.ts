/*
 * @Author: your name
 * @Date: 2021-08-05 13:38:30
 * @LastEditTime: 2021-08-05 14:51:56
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sveltekit-electron-master\src\store\deive.ts
 */
import type { SWPLC } from 'src/worker/socket-worker';
import { writable } from 'svelte/store';

/** 在线plc */
export const deviceKey = writable<Array<string>>(Array.from({length: 20},(v,k) => `A${k+1}`));
export const deviceLiveList = deviceLiveListFunc();
function deviceLiveListFunc() {
  const { subscribe, update } = writable<{ [propName: string]: SWPLC }>({});
  return {
    subscribe,
    /** 上线 */
    push: (device: any) => update(n => {
      return {...n, ...device};
    }),
    /** 下线  */
    pop: (key: string) => update(n => {
      const device: any = {[key]: null};
      return {...n, ...device};
    }),
  }
}