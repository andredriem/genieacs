import * as vm from "node:vm";
import { IncomingMessage, ServerResponse } from "node:http";
import { Collection, ObjectId } from "mongodb";
import { getRevision, getConfig } from "./ui/local-cache.ts";
import { filesBucket, collections } from "./db/db.ts";
import { optimizeProjection } from "./db/util.ts";
import * as query from "./query.ts";
import * as apiFunctions from "./api-functions.ts";
import * as cache from "./cache.ts";
import { version as VERSION } from "../package.json";
import { ping } from "./ping.ts";
import * as logger from "./logger.ts";
import { flattenDevice } from "./ui/db.ts";
import { getRequestOrigin } from "./forwarded.ts";
import { acquireLock, releaseLock } from "./lock.ts";
import { ResourceLockedError } from "./common/errors.ts";
import * as net from 'net';
import * as child_process from 'child_process';
import * as config from './config.ts';
import { cpus } from 'node:os';

const DEVICE_TASKS_REGEX = /^\/devices\/([a-zA-Z0-9\-_%]+)\/tasks\/?$/;
const TASKS_REGEX = /^\/tasks\/([a-zA-Z0-9\-_%]+)(\/[a-zA-Z_]*)?$/;
const TAGS_REGEX =
  /^\/devices\/([a-zA-Z0-9\-_%]+)\/tags\/([a-zA-Z0-9\-_%]+)\/?$/;
const PRESETS_REGEX = /^\/presets\/([a-zA-Z0-9\-_%]+)\/?$/;
const OBJECTS_REGEX = /^\/objects\/([a-zA-Z0-9\-_%]+)\/?$/;
const FILES_REGEX = /^\/files\/([a-zA-Z0-9%!*'();:@&=+$,?#[\]\-_.~]+)\/?$/;
const PING_REGEX = /^\/ping\/([a-zA-Z0-9\-_.:]+)\/?$/;
const QUERY_REGEX = /^\/([a-zA-Z0-9_]+)\/?$/;
const DELETE_DEVICE_REGEX = /^\/devices\/([a-zA-Z0-9\-_%]+)\/?$/;
const PROVISIONS_REGEX = /^\/provisions\/([a-zA-Z0-9\-_%]+)\/?$/;
const VIRTUAL_PARAMETERS_REGEX =
  /^\/virtual_parameters\/([a-zA-Z0-9\-_%]+)\/?$/;
const FAULTS_REGEX = /^\/faults\/([a-zA-Z0-9\-_%:]+)\/?$/;
const PORT_CHECK_REGEX = /^\/port_check\/{0,1}$/;
const GREP_LOG_REGEX = /^\/grep-log\/?$/;
const HEALTH_CHECK_REGEX = /^\/health\/?$/;

async function getBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let readableEnded = false;
  request.on("end", () => {
    readableEnded = true;
  });
  for await (const chunk of request) chunks.push(chunk);
  // In Node versions prior to 15, the stream will not emit an error if the
  // connection is closed before the stream is finished.
  // For Node 12.9+ we can just use stream.readableEnded
  if (!readableEnded) throw new Error("Connection closed");
  return Buffer.concat(chunks);
}

export async function listener(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  response.setHeader("GenieACS-Version", VERSION);

  const origin = getRequestOrigin(request);
  const url = new URL(
    request.url,
    (origin.encrypted ? "https://" : "http://") + origin.host,
  );

  const body = await getBody(request).catch(() => null);
  // Ignore incomplete requests
  if (body == null) return;

  logger.accessInfo(
    Object.assign({}, Object.fromEntries(url.searchParams), {
      remoteAddress: origin.remoteAddress,
      message: `${request.method} ${url.pathname}`,
    }),
  );
  return handler(request, response, url, body);
}

async function handler(
  request: IncomingMessage,
  response: ServerResponse,
  url: URL,
  body: Buffer,
): Promise<void> {
  if (PRESETS_REGEX.test(url.pathname)) {
    const presetName = decodeURIComponent(PRESETS_REGEX.exec(url.pathname)[1]);
    if (request.method === "PUT") {
      let preset;
      try {
        preset = JSON.parse(body.toString());
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }
      preset._id = presetName;
      await collections.presets.replaceOne({ _id: presetName }, preset, {
        upsert: true,
      });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else if (request.method === "DELETE") {
      await collections.presets.deleteOne({ _id: presetName });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "PUT, DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (OBJECTS_REGEX.test(url.pathname)) {
    const objectName = decodeURIComponent(OBJECTS_REGEX.exec(url.pathname)[1]);
    if (request.method === "PUT") {
      let object;
      try {
        object = JSON.parse(body.toString());
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }
      object._id = objectName;
      await collections.objects.replaceOne({ _id: objectName }, object, {
        upsert: true,
      });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else if (request.method === "DELETE") {
      await collections.objects.deleteOne({ _id: objectName });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "PUT, DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (PROVISIONS_REGEX.test(url.pathname)) {
    const provisionName = decodeURIComponent(
      PROVISIONS_REGEX.exec(url.pathname)[1],
    );
    if (request.method === "PUT") {
      const object = {
        _id: provisionName,
        script: body.toString(),
      };

      try {
        new vm.Script(`"use strict";(function(){\n${object.script}\n})();`);
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }

      await collections.provisions.replaceOne({ _id: provisionName }, object, {
        upsert: true,
      });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else if (request.method === "DELETE") {
      await collections.provisions.deleteOne({ _id: provisionName });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "PUT, DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (VIRTUAL_PARAMETERS_REGEX.test(url.pathname)) {
    const virtualParameterName = decodeURIComponent(
      VIRTUAL_PARAMETERS_REGEX.exec(url.pathname)[1],
    );
    if (request.method === "PUT") {
      const object = {
        _id: virtualParameterName,
        script: body.toString(),
      };

      try {
        new vm.Script(`"use strict";(function(){\n${object.script}\n})();`);
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }

      await collections.virtualParameters.replaceOne(
        { _id: virtualParameterName },
        object,
        { upsert: true },
      );
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else if (request.method === "DELETE") {
      await collections.virtualParameters.deleteOne({
        _id: virtualParameterName,
      });
      await cache.del("cwmp-local-cache-hash");
      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "PUT, DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (TAGS_REGEX.test(url.pathname)) {
    const r = TAGS_REGEX.exec(url.pathname);
    const deviceId = decodeURIComponent(r[1]);
    const tag = decodeURIComponent(r[2]);

    // Mongodb typescript integration is horrible
    // and simply does not recognize $mergeObjects
    // but for some reason will accept 
    const toUpdate: object = {
      $addToSet: { _tags: tag },
      $set: {
        [`_tagsWithTimestamp.${tag}`]: Date.now(),
      },
    }

    if (request.method === "POST") {
      const updateRes = await collections.devices.updateOne(
        { _id: deviceId },
        toUpdate
      );

      if (!updateRes.matchedCount) {
        response.writeHead(404);
        response.end("No such device");
        return;
      }

      response.writeHead(200);
      response.end();
    } else if (request.method === "DELETE") {
      const updateRes = await collections.devices.updateOne(
        { _id: deviceId },
        { 
          $pull: { _tags: tag },
          $unset: {
              [`_tagsWithTimestamp.${tag}`]: 1,
          }
        }
      );

      if (!updateRes.matchedCount) {
        response.writeHead(404);
        response.end("No such device");
        return;
      }

      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "POST, DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (FAULTS_REGEX.test(url.pathname)) {
    if (request.method === "DELETE") {
      const faultId = decodeURIComponent(FAULTS_REGEX.exec(url.pathname)[1]);
      try {
        await apiFunctions.deleteFault(faultId);
      } catch (err) {
        if (err instanceof ResourceLockedError) {
          response.writeHead(503);
          response.end("Device is in session");
          return;
        }
        throw err;
      }

      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (DEVICE_TASKS_REGEX.test(url.pathname)) {
    if (request.method === "POST") {
      const deviceId = decodeURIComponent(
        DEVICE_TASKS_REGEX.exec(url.pathname)[1],
      );

      const conReq = url.searchParams.has("connection_request");
      let task;
      if (body.length) {
        try {
          task = JSON.parse(body.toString());
          task.device = deviceId;
        } catch (err) {
          response.writeHead(400);
          response.end(`${err.name}: ${err.message}`);
          return;
        }
      }

      if (!task && !conReq) {
        response.writeHead(400);
        response.end();
        return;
      }

      if (!task || !conReq) {
        const dev = await collections.devices.findOne({ _id: deviceId });
        if (!dev) {
          response.writeHead(404);
          response.end("No such device");
          return;
        }

        if (task) {
          await apiFunctions.insertTasks(task);
          response.writeHead(202, { "Content-Type": "application/json" });
          response.end(JSON.stringify(task));
        } else {
          const status = await apiFunctions.connectionRequest(
            deviceId,
            flattenDevice(dev),
          );
          if (status) {
            response.writeHead(504, status);
            response.end(status);
          } else {
            response.writeHead(200);
            response.end();
          }
        }
        return;
      }

      const socketTimeout: number = request.socket.timeout;

      // Extend socket timeout while waiting for session
      if (socketTimeout) request.socket.setTimeout(300000);

      const token = await acquireLock(`cwmp_session_${deviceId}`, 5000, 30000);
      if (!token) {
        // Restore socket timeout
        if (socketTimeout) request.socket.setTimeout(socketTimeout);
        const dev = await collections.devices.findOne({ _id: deviceId });
        if (!dev) {
          response.writeHead(404);
          response.end("No such device");
          return;
        }

        await apiFunctions.insertTasks(task);
        response.writeHead(202, "Task queued but not processed", {
          "Content-Type": "application/json",
        });
        response.end(JSON.stringify(task));
        return;
      }

      let dev;

      try {
        dev = await collections.devices.findOne({ _id: deviceId });
        if (!dev) {
          response.writeHead(404);
          response.end("No such device");
          return;
        }
        await apiFunctions.insertTasks(task);
      } finally {
        await releaseLock(`cwmp_session_${deviceId}`, token);
      }

      const lastInform = (dev["_lastInform"] as Date).getTime();
      const device = flattenDevice(dev);

      let onlineThreshold: number;
      if (url.searchParams.has("timeout")) {
        onlineThreshold = parseInt(url.searchParams.get("timeout"));
      } else {
        const revision = await getRevision();
        onlineThreshold = getConfig(
          revision,
          "cwmp.deviceOnlineThreshold",
          {},
          Date.now(),
          (exp) => {
            if (!Array.isArray(exp)) return exp;
            if (exp[0] === "PARAM") {
              const p = device[exp[1]];
              if (p?.value) return p.value[0];
            } else if (exp[0] === "FUNC") {
              if (exp[1] === "REMOTE_ADDRESS") {
                for (const root of ["InternetGatewayDevice", "Device"]) {
                  const p =
                    device[`${root}.ManagementServer.ConnectionRequestURL`];
                  if (p?.value) return new URL(p.value[0] as string).hostname;
                }
                return null;
              }
            }
            return exp;
          },
        ) as number;
      }

      let status = await apiFunctions.connectionRequest(deviceId, device);
      if (!status) {
        const sessionStarted = await apiFunctions.awaitSessionStart(
          deviceId,
          lastInform,
          onlineThreshold,
        );
        if (!sessionStarted) {
          status = "Task queued but not processed";
        } else {
          const sessionEnded = await apiFunctions.awaitSessionEnd(
            deviceId,
            120000,
          );
          if (!sessionEnded) {
            status = "Task queued but not processed";
          } else {
            const f = await collections.faults.count({
              _id: `${deviceId}:task_${task._id}`,
            });
            if (f) status = "Task faulted";
          }
        }
      }

      // Restore socket timeout
      if (socketTimeout) request.socket.setTimeout(socketTimeout);

      if (status) {
        response.writeHead(202, status, { "Content-Type": "application/json" });
        response.end(JSON.stringify(task));
      } else {
        response.writeHead(200, { "Content-Type": "application/json" });
        response.end(JSON.stringify(task));
      }
    } else {
      response.writeHead(405, { Allow: "POST" });
      response.end("405 Method Not Allowed");
    }
  } else if (TASKS_REGEX.test(url.pathname)) {
    const r = TASKS_REGEX.exec(url.pathname);
    const taskId = decodeURIComponent(r[1]);
    const action = r[2];
    if (!action || action === "/") {
      if (request.method === "DELETE") {
        const task = await collections.tasks.findOne(
          { _id: new ObjectId(taskId) },
          { projection: { device: 1 } },
        );

        if (!task) {
          response.writeHead(404);
          response.end("Task not found");
          return;
        }

        const deviceId = task.device;
        const token = await acquireLock(`cwmp_session_${deviceId}`, 5000);
        if (!token) {
          response.writeHead(503);
          response.end("Device is in session");
          return;
        }

        try {
          await Promise.all([
            collections.tasks.deleteOne({ _id: new ObjectId(taskId) }),
            collections.faults.deleteOne({ _id: `${deviceId}:task_${taskId}` }),
          ]);
        } finally {
          await releaseLock(`cwmp_session_${deviceId}`, token);
        }

        response.writeHead(200);
        response.end();
      } else {
        response.writeHead(405, { Allow: "PUT DELETE" });
        response.end("405 Method Not Allowed");
      }
    } else if (action === "/retry") {
      if (request.method === "POST") {
        const task = await collections.tasks.findOne(
          { _id: new ObjectId(taskId) },
          { projection: { device: 1 } },
        );

        const deviceId = task.device;
        const token = await acquireLock(`cwmp_session_${deviceId}`, 5000);
        if (!token) {
          response.writeHead(503);
          response.end("Device is in session");
          return;
        }
        try {
          await collections.faults.deleteOne({
            _id: `${deviceId}:task_${taskId}`,
          });
        } finally {
          await releaseLock(`cwmp_session_${deviceId}`, token);
        }

        response.writeHead(200);
        response.end();
      } else {
        response.writeHead(405, { Allow: "POST" });
        response.end("405 Method Not Allowed");
      }
    } else {
      response.writeHead(404);
      response.end();
    }
  } else if (FILES_REGEX.test(url.pathname)) {
    const filename = decodeURIComponent(FILES_REGEX.exec(url.pathname)[1]);
    if (request.method === "PUT") {
      const metadata = {
        fileType: request.headers.filetype,
        oui: request.headers.oui,
        productClass: request.headers.productclass,
        version: request.headers.version,
      };
      try {
        await filesBucket.delete(filename as unknown as ObjectId);
      } catch (err) {
        // Ignore error if file doesn't exist
      }

      return new Promise((resolve, reject) => {
        const uploadStream = filesBucket.openUploadStreamWithId(
          filename as unknown as ObjectId,
          filename,
          {
            metadata: metadata,
          },
        );

        uploadStream.on("error", reject);

        uploadStream.end(body, () => {
          response.writeHead(201);
          response.end();
          resolve();
        });
      });
    } else if (request.method === "DELETE") {
      try {
        await filesBucket.delete(filename as unknown as ObjectId);
      } catch (err) {
        if (err.message.startsWith("FileNotFound")) {
          response.writeHead(404);
          response.end("404 Not Found");
          return;
        }
        throw err;
      }
      response.writeHead(200);
      response.end();
    } else {
      response.writeHead(405, { Allow: "PUT, DELETE" });
      response.end("405 Method Not Allowed");
    }
  } else if (PING_REGEX.test(url.pathname)) {
    const host = decodeURIComponent(PING_REGEX.exec(url.pathname)[1]);
    return new Promise((resolve) => {
      ping(host, (err, res, stdout) => {
        if (err) {
          if (!res) {
            response.writeHead(500, { Connection: "close" });
            response.end(`${err.name}: ${err.message}`);
            return;
          }
          response.writeHead(404, { "Cache-Control": "no-cache" });
          response.end(`${err.name}: ${err.message}`);
          return;
        }

        response.writeHead(200, {
          "Content-Type": "text/plain",
          "Cache-Control": "no-cache",
        });
        response.end(stdout);
        resolve();
      });
    });
  } else if (DELETE_DEVICE_REGEX.test(url.pathname)) {
    if (request.method !== "DELETE") {
      response.writeHead(405, { Allow: "DELETE" });
      response.end("405 Method Not Allowed");
      return;
    }

    const deviceId = decodeURIComponent(
      DELETE_DEVICE_REGEX.exec(url.pathname)[1],
    );

    try {
      await apiFunctions.deleteDevice(deviceId);
    } catch (err) {
      if (err instanceof ResourceLockedError) {
        response.writeHead(503);
        response.end("Device is in session");
        return;
      }
      throw err;
    }

    response.writeHead(200);
    response.end();
  } else if (PORT_CHECK_REGEX.test(url.pathname)) {
    if (request.method === "POST") {
      // Get ip and port from body
      let ip: string;
      let port: number;
      try {
        const json = JSON.parse(body.toString());
        ip = json.ip;
        port = json.port;
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }

      // Check if port is open
      const timeout = 500;
      const isOpen = await checkPort(ip, port, timeout);
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ isOpen , ip, port }));
    } else {
      console.log(`The method ${request.method} is not allowed`);
      response.writeHead(405, { Allow: "POST" });
      response.end("405 Method Not Allowed");
    }
  } else if (GREP_LOG_REGEX.test(url.pathname)) {
    if (request.method === "GET") {
      // Get device_id from query parameter
      const deviceId = url.searchParams.get('device_id');

      if (!deviceId) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
          error: "Bad Request",
          message: "device_id query parameter is required"
        }));
        return;
      }

      const logFile = "/var/log/genieacs/genieacs-cwmp-access.log";

      try {
        logger.accessInfo({
          message: `Grep log request for deviceId: ${deviceId}`,
          deviceId: deviceId,
        });

        // Use spawn instead of exec to prevent command injection
        // spawn doesn't use a shell, so arguments are passed safely
        const grep = child_process.spawn('grep', [deviceId, logFile]);

        let stdout = '';
        let stderr = '';

        grep.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        grep.stderr.on('data', (data) => {
          stderr += data.toString();
        });

        grep.on('close', (code) => {
          if (code === 0) {
            // grep found matches
            logger.accessInfo({
              message: `Successfully retrieved log entries for deviceId: ${deviceId}`,
              deviceId: deviceId,
              lines: stdout.split('\n').filter(l => l).length,
            });
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ body: stdout }));
          } else if (code === 1) {
            // grep returns exit code 1 when no matches found
            logger.accessInfo({
              message: `No log entries found for deviceId: ${deviceId}`,
              deviceId: deviceId,
            });
            response.writeHead(200, { "Content-Type": "application/json" });
            response.end(JSON.stringify({ body: "" }));
          } else {
            // Other errors
            logger.accessError({
              message: `Error executing grep command for deviceId: ${deviceId}`,
              deviceId: deviceId,
              exitCode: code,
              stderr: stderr,
            });
            response.writeHead(500, { "Content-Type": "application/json" });
            response.end(JSON.stringify({
              error: "Internal server error",
              message: "Error executing grep command"
            }));
          }
        });

        grep.on('error', (error) => {
          logger.accessError({
            message: `Error spawning grep process for deviceId: ${deviceId}`,
            deviceId: deviceId,
            error: error.message,
          });
          response.writeHead(500, { "Content-Type": "application/json" });
          response.end(JSON.stringify({
            error: "Internal server error",
            message: error.message
          }));
        });
      } catch (err) {
        logger.accessError({
          message: `Exception in grep-log endpoint for deviceId: ${deviceId}`,
          deviceId: deviceId,
          error: err.message,
        });
        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
          error: "Internal server error",
          message: err.message
        }));
      }
    } else {
      response.writeHead(405, { Allow: "GET" });
      response.end("405 Method Not Allowed");
    }
  } else if (HEALTH_CHECK_REGEX.test(url.pathname)) {
    if (request.method === "GET") {
      try {
        const healthStatus = await performHealthCheck();
        const httpStatus = healthStatus.overall === "healthy" ? 200 : 503;
        response.writeHead(httpStatus, { "Content-Type": "application/json" });
        response.end(JSON.stringify(healthStatus, null, 2));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorStack = err instanceof Error ? err.stack : undefined;

        logger.accessError({
          message: "Exception in health check endpoint",
          error: errorMessage,
          stack: errorStack,
        });

        response.writeHead(500, { "Content-Type": "application/json" });
        response.end(JSON.stringify({
          overall: "unhealthy",
          error: "Internal server error",
          message: errorMessage
        }));
      }
    } else {
      response.writeHead(405, { Allow: "GET" });
      response.end("405 Method Not Allowed");
    }
  } else if (QUERY_REGEX.test(url.pathname)) {
    let collectionName = QUERY_REGEX.exec(url.pathname)[1];

    // Convert to camel case
    let i = collectionName.indexOf("_");
    while (i++ >= 0) {
      const up =
        i < collectionName.length ? collectionName[i].toUpperCase() : "";
      collectionName =
        collectionName.slice(0, i - 1) + up + collectionName.slice(i + 1);
      i = collectionName.indexOf("_", i);
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { Allow: "GET, HEAD" });
      response.end("405 Method Not Allowed");
      return;
    }

    const collection = collections[collectionName] as Collection<unknown>;
    if (!collection) {
      response.writeHead(404);
      response.end("404 Not Found");
      return;
    }

    let q = {};
    if (url.searchParams.has("query")) {
      try {
        q = JSON.parse(url.searchParams.get("query") as string);
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }
    }

    switch (collectionName) {
      case "devices":
        q = query.expand(q);
        break;
      case "tasks":
        q = query.sanitizeQueryTypes(q, {
          _id: (v) => new ObjectId(v as string),
          timestamp: (v) => new Date(v as number),
          retries: Number,
        });
        break;
      case "faults":
        q = query.sanitizeQueryTypes(q, {
          timestamp: (v) => new Date(v as number),
          retries: Number,
        });
    }

    let projection = null;
    if (url.searchParams.has("projection")) {
      projection = {};
      for (const p of (url.searchParams.get("projection") as string).split(","))
        projection[p.trim()] = 1;
      projection = optimizeProjection(projection);
    }

    const cur = collection.find(q, { projection: projection });

    if (url.searchParams.has("sort")) {
      let s;
      try {
        s = JSON.parse(url.searchParams.get("sort") as string);
      } catch (err) {
        response.writeHead(400);
        response.end(`${err.name}: ${err.message}`);
        return;
      }
      const sort = {};
      for (const [k, v] of Object.entries(s)) {
        if (k[k.lastIndexOf(".") + 1] !== "_" && collectionName === "devices")
          sort[`${k}._value`] = v;
        else sort[k] = v;
      }

      cur.sort(sort);
    }

    const total = await collection.countDocuments(q);

    response.writeHead(200, {
      "Content-Type": "application/json",
      total: total,
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    if (url.searchParams.has("skip"))
      cur.skip(parseInt(url.searchParams.get("skip") as string));

    if (url.searchParams.has("limit"))
      cur.limit(parseInt(url.searchParams.get("limit") as string));

    response.write("[\n");
    i = 0;
    for await (const item of cur) {
      if (i++) response.write(",\n");
      response.write(JSON.stringify(item));
    }
    response.end("\n]");
  } else {
    response.writeHead(404);
    response.end("404 Not Found");
  }
}


/** Check if an ip port is open */
async function checkPort(ip: string, port: number, timeout: number): Promise<boolean> {
  return new Promise((resolve) => {
      let trueIp = ip;
      // When ip is a v6 it might come in brackets we must remove them
      if(ip.startsWith('[') && ip.endsWith(']')) {
        // Check if it is a valid ipv6
        trueIp = ip.slice(1, -1);
        if(net.isIPv6(trueIp)) {
          // nothing to do string is already valid
        }else{
          // Fallback to original ip
          trueIp = ip;
        }
      }

      const socket = new net.Socket();
      socket.setTimeout(timeout);

      socket.on('connect', () => {
          socket.destroy();
          resolve(true);
      });

      socket.on('error', () => {
          resolve(false);
      });

      socket.on('timeout', () => {
          socket.destroy();
          resolve(false);
      });

      socket.connect(port, trueIp);
  });
}

interface ServiceHealth {
  status: "online" | "offline" | "unhealthy";
  port: number;
  portOpen: boolean;
  expectedWorkers: number;
  actualWorkers: number;
  workerPids?: number[];
}

interface HealthCheckResult {
  overall: "healthy" | "unhealthy";
  timestamp: string;
  services: {
    cwmp: ServiceHealth;
    nbi: ServiceHealth;
    fs: ServiceHealth;
    ui: ServiceHealth;
  };
  mongodb: {
    status: "online" | "offline";
    connected: boolean;
    error?: string;
  };
}

/** Get worker count and PIDs for a specific service */
function getWorkerInfo(serviceName: string): { count: number; pids: number[] } {
  try {
    const psOutput = child_process.execSync('ps -aux', { encoding: 'utf-8' });
    const lines = psOutput.split('\n');
    const servicePattern = new RegExp(`genieacs-${serviceName}\\s*$`);

    const workerPids: number[] = [];
    for (const line of lines) {
      if (servicePattern.test(line)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length > 1) {
          const pid = parseInt(parts[1]);
          if (!isNaN(pid)) {
            workerPids.push(pid);
          }
        }
      }
    }

    // Subtract 1 for the master process (total processes - 1 = worker count)
    // Ensure count doesn't go below 0
    const workerCount = Math.max(0, workerPids.length - 1);

    return { count: workerCount, pids: workerPids };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    logger.accessError({
      message: `Error getting worker info for ${serviceName}`,
      error: errorMessage,
      stack: errorStack,
    });
    return { count: 0, pids: [] };
  }
}

/** Check MongoDB connection health */
async function checkMongoDBHealth(): Promise<{ status: "online" | "offline"; connected: boolean; error?: string }> {
  try {
    // Try to ping the database
    await collections.devices.findOne({}, { projection: { _id: 1 } });
    return { status: "online", connected: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    logger.accessError({
      message: "MongoDB health check failed",
      error: errorMessage,
      stack: errorStack,
    });

    return {
      status: "offline",
      connected: false,
      error: errorMessage
    };
  }
}

/** Get expected worker count based on config */
function getExpectedWorkerCount(serviceType: string): number {
  try {
    const configKey = `${serviceType.toUpperCase()}_WORKER_PROCESSES`;
    const workerCount = config.get(configKey) as number;

    // If workerCount is 0 (default), use Math.max(2, cpus().length)
    // This matches the logic in cluster.ts
    if (!workerCount) {
      return Math.max(2, cpus().length);
    }

    return workerCount;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    logger.accessError({
      message: `Error getting expected worker count for ${serviceType}`,
      error: errorMessage,
      stack: errorStack,
    });

    // Return safe default
    return Math.max(2, cpus().length);
  }
}

/** Perform comprehensive health check */
async function performHealthCheck(): Promise<HealthCheckResult> {
  const timeout = 1000;
  const localhost = '127.0.0.1';

  // Get ports from config with safe defaults
  let ports: { cwmp: number; nbi: number; fs: number; ui: number };
  try {
    ports = {
      cwmp: (config.get("CWMP_PORT") as number) || 7547,
      nbi: (config.get("NBI_PORT") as number) || 7557,
      fs: (config.get("FS_PORT") as number) || 7567,
      ui: (config.get("UI_PORT") as number) || 3000,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorStack = err instanceof Error ? err.stack : undefined;

    logger.accessError({
      message: "Error reading port configuration, using defaults",
      error: errorMessage,
      stack: errorStack,
    });

    // Use default ports
    ports = {
      cwmp: 7547,
      nbi: 7557,
      fs: 7567,
      ui: 3000,
    };
  }

  // Get expected worker counts from config
  const expectedWorkers = {
    cwmp: getExpectedWorkerCount('cwmp'),
    nbi: getExpectedWorkerCount('nbi'),
    fs: getExpectedWorkerCount('fs'),
    ui: getExpectedWorkerCount('ui'),
  };

  // Check all ports in parallel
  const [cwmpPortOpen, nbiPortOpen, fsPortOpen, uiPortOpen, mongoHealth] = await Promise.all([
    checkPort(localhost, ports.cwmp, timeout),
    checkPort(localhost, ports.nbi, timeout),
    checkPort(localhost, ports.fs, timeout),
    checkPort(localhost, ports.ui, timeout),
    checkMongoDBHealth(),
  ]);

  // Get worker counts
  const cwmpWorkers = getWorkerInfo('cwmp');
  const nbiWorkers = getWorkerInfo('nbi');
  const fsWorkers = getWorkerInfo('fs');
  const uiWorkers = getWorkerInfo('ui');

  // Determine service health status
  const getServiceStatus = (
    portOpen: boolean,
    actualWorkers: number,
    expectedCount: number
  ): "online" | "offline" | "unhealthy" => {
    if (!portOpen) return "offline";
    if (actualWorkers === 0) return "offline";
    if (actualWorkers !== expectedCount) return "unhealthy";
    return "online";
  };

  const services = {
    cwmp: {
      status: getServiceStatus(cwmpPortOpen, cwmpWorkers.count, expectedWorkers.cwmp),
      port: ports.cwmp,
      portOpen: cwmpPortOpen,
      expectedWorkers: expectedWorkers.cwmp,
      actualWorkers: cwmpWorkers.count,
      workerPids: cwmpWorkers.pids,
    },
    nbi: {
      status: getServiceStatus(nbiPortOpen, nbiWorkers.count, expectedWorkers.nbi),
      port: ports.nbi,
      portOpen: nbiPortOpen,
      expectedWorkers: expectedWorkers.nbi,
      actualWorkers: nbiWorkers.count,
      workerPids: nbiWorkers.pids,
    },
    fs: {
      status: getServiceStatus(fsPortOpen, fsWorkers.count, expectedWorkers.fs),
      port: ports.fs,
      portOpen: fsPortOpen,
      expectedWorkers: expectedWorkers.fs,
      actualWorkers: fsWorkers.count,
      workerPids: fsWorkers.pids,
    },
    ui: {
      status: getServiceStatus(uiPortOpen, uiWorkers.count, expectedWorkers.ui),
      port: ports.ui,
      portOpen: uiPortOpen,
      expectedWorkers: expectedWorkers.ui,
      actualWorkers: uiWorkers.count,
      workerPids: uiWorkers.pids,
    },
  };

  // Determine overall health
  const allServicesHealthy = Object.values(services).every(s => s.status === "online");
  const mongoHealthy = mongoHealth.connected;
  const overall = allServicesHealthy && mongoHealthy ? "healthy" : "unhealthy";

  return {
    overall,
    timestamp: new Date().toISOString(),
    services,
    mongodb: mongoHealth,
  };
}