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

    let request_data = {
      duration: 10,
      devices: [{
        id: data.header.loggerSerial,
        temperature: data.payload.inverter.radiator_temp_celsius,
        outputsAC: [
          {
            id: 1,
            voltage: data.payload.grid.v,
            ampere: data.payload.grid.i,
            watt: data.payload.grid.active_power_w,
            totalKWH: data.payload.grid.kWh_total,
            frequency: data.payload.grid.hz,
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
      if (!response.ok) {
        Logger.warn("Received data not handled becaue of:", res);
      }
    }).error(err=>{
      Logger.warn("Conneciton to server failed", err);
    })
  }
}

module.exports = TSMClient;