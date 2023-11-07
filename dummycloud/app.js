const DummyCloud = require("./src/DummyCloud");
const Logger = require("./src/Logger");
const MqttClient = require("./src/MqttClient");
const TSMClient = require("./src/TSMClient");

if (process.env.LOGLEVEL) {
    Logger.setLogLevel(process.env.LOGLEVEL);
}

const dummyCloud = new DummyCloud();
//const mqttClient = new MqttClient(dummyCloud);
const tsmClient = new TSMClient(dummyCloud);

dummyCloud.initialize();
//mqttClient.initialize();
tsmClient.initialize();
