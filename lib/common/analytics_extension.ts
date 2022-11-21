import { AcsRequest, DeviceData, GetParameterNames, GetParameterValues, SessionContext } from "../types";
import * as logger from "../logger";


export function processAnalytics(
  sessionContext: SessionContext,
  requestBody?: string,
): AcsRequest | null{

  return null;
  sessionContext.debug = true

  if(sessionContext.analyticsStorage === undefined)
    sessionContext.analyticsStorage = {};

  if(sessionContext.analyTicsIteation === undefined)
    sessionContext.analyTicsIteation = 0;



    logger.accessWarn({
      sessionContext: sessionContext,
      message: `AuthState: ${sessionContext.authState}`,
    });

    logger.accessWarn({
      sessionContext: sessionContext,
      message: `Iteration: ${sessionContext.analyTicsIteation}`,
    });

    logger.accessWarn({
      sessionContext: sessionContext,
      message: `Analytics Storage: ${JSON.stringify(sessionContext.analyticsStorage)}`,
    });
  
  

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


function generateGetParameterNames(parameterPath: string, nextLevel: boolean): GetParameterNames{
  return {
    name: "GetParameterNames",
    parameterPath: parameterPath,
    nextLevel: nextLevel,
  }
}

function genetrateGetParameterValues(paths: string[]): GetParameterValues{
  return {
    name: "GetParameterValues",
    parameterNames: paths,
  }
}

function generateArguments(analyTicsIteation, deviceData): AcsRequest | null{
  switch (analyTicsIteation) {
    case 0:
      return generateGetParameterNames("InternetGatewayDevice.LANDevice.", false)
      break;
    case 1:
      return genetrateGetParameterValues(["InternetGatewayDevice.DeviceInfo.Manufacturer"])
      break;      
    default:
      return null;
      break;
  }

}

