import { GetParameterValues } from "../soap";
import { DeviceData, SessionContext } from "../types";


export function processAnalytics(
  sessionContext: SessionContext,
  requestBody?: string,
): string[] {

  if(sessionContext.analyticsStorage === undefined)
    sessionContext.analyticsStorage = {};

  if(sessionContext.analyTicsIteation === undefined)
    sessionContext.analyTicsIteation = 0;

  const nextIterationOfGetValues = generateArguments(sessionContext.analyTicsIteation, sessionContext.deviceData)
  
  // No more ite
  if(nextIterationOfGetValues === null){
    // If analytics iteration is 0 means no new data was collected during analytics
    // processing
    if(sessionContext.analyTicsIteation === 0)
      return null;
    void exportCurrentDeviceData(sessionContext.deviceData)
    return null;
  }


  sessionContext.analyTicsIteation += 1;
  return nextIterationOfGetValues
}


async function exportCurrentDeviceData(deviceData: DeviceData): Promise<void> {
  return;
}


function generateArguments(analyTicsIteation, deviceData): string[] | null{
  switch (analyTicsIteation) {
    case 0:
      return [
        "InternetGatewayDevice.LANDevice.1.Hosts.Host.3.AddressSource",
        "InternetGatewayDevice.LANDevice.1.Hosts.Host.3.MACAddress",
      ]
      break;
    case 1:
      return [
        "InternetGatewayDevice.DeviceInfo.ModelName"
      ]
      break;
    default:
      return null;
      break;
  }

}

