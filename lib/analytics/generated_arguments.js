/* eslint-disable no-case-declarations */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
const pathList = [
  "InternetGatewayDevice.DeviceInfo.SoftwareVersion",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Channel",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Standard",
  "InternetGatewayDevice.LANDevice.\\d+.Hosts.Host.\\d+.MACAddress",
  "InternetGatewayDevice.LANDevice.\\d+.Hosts.Host.\\d+.Active",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.AssociatedDeviceMACAddress",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.TXPower",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.BytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.BytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.Stats.DropPackets",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.\\d+.X_GponInterafceConfig.Stats.ErrorRate",
  "InternetGatewayDevice.DeviceInfo.X_HW_MemUsed",
  "InternetGatewayDevice.DeviceInfo.X_HW_CpuUsed",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.X_HW_Standard",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_HW_SNR",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_HW_RSSI",
  "InternetGatewayDevice.LANDevice.\\d+.Hosts.Host.\\d+.X_HW_RSSI",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.DeviceInfo.MemoryStatus.Free",
  "InternetGatewayDevice.DeviceInfo.MemoryStatus.Total",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsSent",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.TXPower",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.Stats.BytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.Stats.BytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.Stats.DropPackets",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.\\d+.X_ZTE-COM_WANPONInterfaceConfig.Stats.ErrorRate",
  "InternetGatewayDevice.DeviceInfo.X_ZTE-COM_MemUsed",
  "InternetGatewayDevice.DeviceInfo.X_ZTE-COM_CpuUsed",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.X_HW_Standard",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_HW_SNR",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_ZTE-COM_RSSI",
  "InternetGatewayDevice.LANDevice.\\d+.Hosts.Host.\\d+.X_ZTE-COM_RSSI",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsSent",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.RXPower",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.TXPower",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.BytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.BytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.Stats.DropPackets",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.TransceiverTemperature",
  "InternetGatewayDevice.WANDevice.\\d+.X_FH_GponInterfaceConfig.Stats.ErrorRate",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.SignalStrength",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.OperatingStandard",
  "InternetGatewayDevice.X_ALU_OntOpticalParam.TransceiverTemperature",
  "InternetGatewayDevice.DeviceInfo.MemoryStatus.Free",
  "InternetGatewayDevice.DeviceInfo.MemoryStatus.Total",
  "InternetGatewayDevice.X_ALU_OntOpticalParam.RXPower",
  "InternetGatewayDevice.X_ALU_OntOpticalParam.TXPower",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.DeviceInfo.MemoryStatus.Free",
  "InternetGatewayDevice.DeviceInfo.MemoryStatus.Total",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_TP_StaSignalStrength",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetBytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetBroadcastPacketsSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANEthernetInterfaceConfig.Stats.BytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANEthernetInterfaceConfig.Stats.BytesSent",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetDiscardPacketsReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetDiscardPacketsSentt",
  "InternetGatewayDevice.WANDevice.\\d+.WANEthernetInterfaceConfig.Stats.BytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANEthernetInterfaceConfig.Stats.BytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.X_TP_WANUSB3gLinkConfig.SignalStrength",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.X_TP_WDSBridge.BridgeRSSI",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_TP_StaSignalStrength",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.AssociatedDevice.\\d+.X_TP_StaSignalStrength",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsReceived",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.Stats.DiscardPacketsSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.WANDevice.\\d+.WANEthernetInterfaceConfig.Stats.BytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANEthernetInterfaceConfig.Stats.BytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetDiscardPacketsReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetDiscardPacketsSent",
  "InternetGatewayDevice.LANDevice.\\d+.WLANConfiguration.\\d+.X_TP_WDSBridge.BridgeRSSI",
  "InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.DownloadDiagnostics.TotalBytesReceived",
  "InternetGatewayDevice.DownloadDiagnostics.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.DeviceInfo.UpTime",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANCommonInterfaceConfig.TotalBytesSent",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetDiscardPacketsReceived",
  "InternetGatewayDevice.WANDevice.\\d+.WANConnectionDevice.\\d+.WANPPPConnection.\\d+.Stats.EthernetDiscardPacketsSent",
]

const pathListRegexMatcher = new RegExp(pathList.join("|"))

//fasthash
const cyrb53 = (str, seed = 0) => {
  let h1 = 0xdeadbeef ^ seed,
    h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
};

module.exports = function generateArguments(context) {

  

  //Device if analytics will run
  if(context.previousAnalyticsRunTimestamp > sessionTimestamp - (3 * 60 * 1000)){
    context.log("No need to run analytics")
    return null;
  }

  const desiredParameterValues = []
  const analyticsExportValuyes = []

  if(!context.cpeResponse && context.analyTicsIteation !== 0){
    //context.log(`Strange CPE RESPONSE ITERATION ${context.analyTicsIteation}: ${context.cpeResponse}`)
    return null;
  }  

  switch (context.analyTicsIteation) {
    case 0:
      return context.generateGetParameterNames("InternetGatewayDevice.", false)
    case 1:

      context.cpeResponse.parameterList.forEach(parameter => {
        const path = parameter[0].toString()

        if (path.match(pathListRegexMatcher)) {
          //context.log(`Adding parameter: ${path}`);
          desiredParameterValues.push(path)
        }
      });



      return context.genetrateGetParameterValues(desiredParameterValues)
    case 2:

      let firmware = ""
      let cpu = ""
      let cpu_path = ""

      context.cpeResponse.parameterList.forEach(parameter => {
        const path = parameter[0].toString()
        if(path.match(/InternetGatewayDevice.DeviceInfo.ProcessStatus.CPUUsage|InternetGatewayDevice.DeviceInfo.X_ZTE-COM_CpuUsed|InternetGatewayDevice.DeviceInfo.X_HW_CpuUsed/)){
          cpu =  parameter[1]
          cpu_path = parameter[0].toString()
        }
        if(path.match(/InternetGatewayDevice.DeviceInfo.SoftwareVersion/))
          firmware = parameter[1]

        analyticsExportValuyes.push({ path: path, value: parameter[1] })
      })

      //if(cpu !== "")
      //  context.log(`FIRMWARE ${firmware}  CPU ${cpu_path}: ${cpu}`)

      //context.log(`Exported paths: ${JSON.stringify(analyticsExportValuyes)}`);
      // eslint-disable-next-line no-undef, @typescript-eslint/no-empty-function
      args = [context.deviceId, analyticsExportValuyes]
      void analytics_stage_data(args, () => {})
      //if(typeof analytics_stage_data === 'function'){
      //  analytics_stage_data(analyticsExportValuyes)
      //  logger.accessWarn({
      //    sessionContext: sessionContext,
      //    message: `Called Function`,
      //  });
      //}
      return null;
  }

  return null;

}



// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Pool } = require('pg');

const __safe_json = (json_file) => {
  try {
    return {
      "user": "timescaledb",
      "host": "analytics_db",
      "database": "analytics",
      "password": "muFxZ+GwF325Fw",
      "port": "5432",
      "enable_log": false,
      "limit_pass_through": false,
      "limit_range": 5,
    };
  }
  catch (e) { return null; }
}

const CONFIG = __safe_json('./analytics_config.json') ||
{
  enable_log: true,
  limit_pass_through: true,
  limit_range: 5
};

const DB_CONFIG = __safe_json('./analytics_config_db.json');

var db_pool = null;

function connect_db() {
  if (db_pool)
    return;

  db_pool = new Pool(DB_CONFIG);
}

async function analytics_stage_data(args, callback) {
  if (!DB_CONFIG)
    return;

  connect_db();

  const device_id = args[0];
  const data = JSON.stringify(args[1]);

  try {
    if (CONFIG.limit_pass_through) {
      const check_8bit = __parse_string_hash(device_id);

      if (check_8bit >= CONFIG.limit_range) {
        callback();
        return;
      }
    }

    const _p1 = db_pool.query
      (
        "INSERT INTO acs.staging_0 (device_id, json_data, update_unixtime) VALUES ($1, $2, $3) ON CONFLICT (device_id) DO UPDATE SET json_data = excluded.json_data, update_unixtime = excluded.update_unixtime",
        [device_id, data, Math.floor(Date.now() / 1000)]
      );

    const _p2 = db_pool.query
      (
        "UPDATE acs.devices_0 SET flag_data = true WHERE device_id = $1",
        [device_id]
      );

    const _r = await Promise.all([_p1, _p2]);

    if (_r[1].rowCount == 0)
      await db_pool.query
        (
          "INSERT INTO acs.devices_0 (device_id, flag_data) VALUES ($1, true)",
          [device_id]
        );
  }
  catch (e) {
    console.log('analytics error:', e);
    if (CONFIG.enable_log)
      log(e);
  }

  callback();
}

function __parse_string_hash(string) {
  let check_accum = 0;

  for (let i = 0; i < string.length; i++)
    check_accum += string.chtarCodeAt(i);

  check_accum = check_accum % 256;

  return check_accum;
}

