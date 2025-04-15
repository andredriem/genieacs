/** Simple single-threaded server to live stream cwmp-access logs  */

import express from 'express';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';

const app = express();
const port = process.env.PORT || 3000;
const targetEndpoint = process.env.LOG_WEBHOOK_ENDPOINT;
if (!targetEndpoint) {
  console.error("LOG_WEBHOOK_ENDPOINT environment variable is not set.");
  process.exit(1);
}
const logFile = process.env.LOG_FILE || '/var/log/genieacs/genieacs-cwmp-access.log';

// Use Express JSON middleware in case JSON bodies are sent.
app.use(express.json());

interface Listener {
  child: ChildProcessWithoutNullStreams;
  timer: NodeJS.Timeout;
}

// A Map to hold active listeners keyed by device ID.
const listeners: Map<string, Listener> = new Map();

/**
 * POST /start-listener
 *
 * Request Parameters (query or JSON body):
 * - deviceid: string (required) — Unique identifier for the device.
 *
 * Behavior:
 *  • If no listener exists for the given deviceid, start a new one:
 *    - Tails the log file (applying the filter if provided).
 *    - For each log line received, asynchronously POSTs the log (along with the deviceid)
 *      to the LOG_WEBHOOK_ENDPOINT.
 *    - Automatically terminates the listener after 1 minute of inactivity.
 *
 *  • If a listener for the deviceid already exists, refresh its one-minute timer.
 */
app.post('/start-listener', (req, res) => {
  // Retrieve deviceid and optional filter from query parameters or JSON body.
  const deviceid: string =
    typeof req.query.deviceid === 'string' ? req.query.deviceid : req.body?.deviceid;
  const filter: string =
    typeof req.query.filter === 'string'
      ? req.query.filter
      : (req.body && req.body.filter) || '';

  if (!deviceid) {
    res.status(400).json({ error: "Missing 'deviceid' parameter." });
    return;
  }

  // If a listener already exists for this device, refresh its timeout.
  if (listeners.has(deviceid)) {
    const existingListener = listeners.get(deviceid)!;
    clearTimeout(existingListener.timer);
    existingListener.timer = setTimeout(() => {
      try {
        // Kill process group to ensure the listener and its subprocesses are terminated.
        process.kill(-existingListener.child.pid, 'SIGKILL');
        console.log(`Listener for deviceid '${deviceid}' timed out and was terminated.`);
      } catch (err) {
        console.error(`Error killing listener for deviceid '${deviceid}':`, err);
      }
      listeners.delete(deviceid);
    }, 60000); // 1 minute timeout

    res.json({
      status: "Listener refreshed",
      deviceid,
      pid: existingListener.child.pid
    });
    return;
  }

  // Build the tail command; if a filter is provided, pipe the output through grep.
  let command = `tail -f ${logFile}`;
  if (filter) {
    command += ` | grep --line-buffered '${filter}'`;
  }

  // Spawn the tail process in detached mode so we can kill the entire process group later.
  const child = spawn(command, { shell: true, detached: true });
  child.unref();

  // Set a timeout to terminate this listener after one minute of inactivity.
  const timer = setTimeout(() => {
    try {
      process.kill(-child.pid, 'SIGKILL');
      console.log(`Listener for deviceid '${deviceid}' timed out and was terminated.`);
    } catch (err) {
      console.error(`Error killing listener for deviceid '${deviceid}':`, err);
    }
    listeners.delete(deviceid);
  }, 60000);

  // Listen for log lines on stdout, and asynchronously post them using fetch.
  child.stdout.on('data', (data: Buffer) => {
    void (async () => {
      const logLine = data.toString();
      console.log(`Device '${deviceid}' log line:`, logLine);
      try {
        const response = await fetch(targetEndpoint + "/acs_clients/livelog", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceid, log: logLine })
        });
        console.log(`Posted log line for device '${deviceid}' (status: ${response.status}).`);
      } catch (error: any) {
        console.error(`Error posting log line for device '${deviceid}':`, error.message);
      }
    })();
  });

  child.stderr.on('data', (data: Buffer) => {
    console.error(`Listener stderr for device '${deviceid}':`, data.toString());
  });

  child.on('error', (err: Error) => {
    console.error(`Error in listener process for device '${deviceid}':`, err);
    listeners.delete(deviceid);
  });

  child.on('exit', (code, signal) => {
    console.log(`Listener process for device '${deviceid}' exited (code: ${code}, signal: ${signal}).`);
    listeners.delete(deviceid);
  });

  // Save the listener in the map.
  listeners.set(deviceid, { child, timer });

  res.json({
    status: "Listener started",
    deviceid,
    pid: child.pid
  });
});

// Start the Express server.
app.listen(port, () => {
  console.log(`Express server listening on port ${port}`);
});
