const Logger = require("./Logger");
const fetch = require('node-fetch');

class TSMClient {

  constructor(dummyCloud) {
    this.dummyCloud = dummyCloud;

    this.dummyCloud.onHandshake((data) => {
      this.handleHandshake(data);
    });
    this.dummyCloud.onData((data) => {
      this.handleData(data);
    });

    this.options = {
      url: "http://localhost:8050/api/solar/data/deye",
      token: "123456789"
    };


  }

  initialize() {

    if (process.env.TSM_TOKEN) {
      this.options.token = process.env.TSM_TOKEN;
    }

    if (process.env.TSM_URL) {
      this.options.url = process.env.TSM_URL;
    }

  }

  handleHandshake(data) {
    // Nothing to see here
  }

  handleData(data) {

    if(data.payload.inverter_meta.mppt_count === 0){
      Logger.info("Skipped invalid Data packet");
      return;
    }

    const voltMax = 255;
    const voltMin = 205;

    let out_voltage = data.payload.grid.v;

    /*if(out_voltage * 2 < voltMax && out_voltage * 2 > voltMin){
      out_voltage *= 2;
    }*/

    if(out_voltage > voltMax || out_voltage < voltMin){
      out_voltage = null
    }

    const maxFreq = 51;
    const minFreq = 49;

    let out_freq = data.payload.grid.hz;

    /*if(out_freq * 2 < maxFreq && out_freq * 2 > minFreq){
      out_freq *= 2;
    }*/

    if(out_freq > maxFreq || out_freq < minFreq){
      out_freq = null
    }

    let out_temp = data.payload.inverter.radiator_temp_celsius

    if(!(out_temp < 10 && out_temp > 10)){
      out_temp = null
    }

    let request_data = {
      duration: 60 * 5,
      devices: [{
        id: data.header.loggerSerial,
        temperature: data.payload.inverter.radiator_temp_celsius,
        outputsAC: [
          {
            id: 1,
            voltage: out_voltage,
            ampere: data.payload.grid.i,
            watt: data.payload.grid.active_power_w,
            totalKWH: data.payload.grid.kWh_total,
            frequency: out_freq
          }
        ],
        inputsDC:[]
      }]
    }


    for (let i = 1; i <= data.payload.inverter_meta.mppt_count; i++) {

      let pv = data.payload.pv[`${i}`];

      if(pv.v <= 0){
        continue
      }

      let input = {
        id: i,
        voltage: pv.v,
        ampere: pv.i,
        watt: pv.w,
        totalKWH: pv.kWh_total
      }

      request_data.devices[0].inputsDC.push(input);
    }

    Logger.info("New data packet for serial: ",data.header.loggerSerial);
    Logger.debug("Sending json to application", request_data);

    const response = fetch(this.options.url+"?serialId="+data.header.loggerSerial, {
      method: 'POST',
      body: JSON.stringify(request_data), // string or object
      headers: {
        'Content-Type': 'application/json',
        "clientToken": this.options.token
      }
    });

    response.then(res=>{
      Logger.debug("Response was: ", res);
      if (!res.ok) {
        Logger.warn("Received data not handled becaue of:", res.status, res.statusText);
      }
    }).catch(err=>{
      Logger.warn("Conneciton to server failed", err);
    })
  }
}

module.exports = TSMClient;