/*
 * @Author: your name
 * @Date: 2020-08-31 12:10:35
 * @LastEditTime: 2020-08-31 12:50:21
 * @LastEditors: Please set LastEditors
 * @Description: In User Settings Edit
 * @FilePath: \sd-client\src\electron\modbus\index.ts
 */
// const { createSerialPort } = require("./serialPort");
import { modbusCmd } from "./CMD";
import { SocketTCP } from './socket/socket';

export {
    modbusCmd,
    SocketTCP
}