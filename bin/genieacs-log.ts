import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import express, { Request, Response, NextFunction } from 'express'; // ← changed

const app = express();
const port = process.env.PORT || 3001;
const targetEndpoint = process.env.LOG_WEBHOOK_ENDPOINT!;
if (!targetEndpoint) {
  console.error("LOG_WEBHOOK_ENDPOINT environment variable is not set.");
  process.exit(1);
}
const logFile = process.env.LOG_FILE || '/var/log/genieacs/genieacs-cwmp-access.log';
const MAX_LINES = 100000

app.use(express.json());

interface Listener {
  child: ChildProcessWithoutNullStreams;
  timer: NodeJS.Timeout;
}

const listeners = new Map<string, Listener>();

app.post('/start-listener', 
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  (req: Request, res: Response, next: NextFunction) => {
    // now only from JSON body:
    (async () => {
      let deviceid = req.body?.device_id as string | undefined;
      const pppoeUsername = req.body?.pppoe_username as string | undefined;
      const macList = req.body?.mac_list as string[] | undefined;

      // If deviceid is undefined we will try to parse the last 100k lines of the log in hope of finding the deviceid
      deviceid = await tryToFindDeviceId(pppoeUsername, macList);

      if (!deviceid) {
        res.status(400).json({ error: "Missing 'deviceid' in request body and couldnt infer it from the log file." });
        return;
      }

      let dataChunkId = 0;
      let lastTimePosted = 0;
      let dataBuffer: string[] = [];

      // if already exists, just refresh timeout
      if (listeners.has(deviceid)) {
        const existing = listeners.get(deviceid)!;
        clearTimeout(existing.timer);
        existing.timer = setTimeout(() => {
          try { process.kill(-existing.child.pid, 'SIGKILL'); }
          catch (e) { console.error(e); }
          listeners.delete(deviceid);
        }, 60_000);
        res.json({
          status: "Listener refreshed",
          deviceid,
          pid: existing.child.pid
        });
        return;
      }

      // build command
      let cmd = `tail -f ${logFile}`;
      if (deviceid) {
        cmd += ` | grep '${deviceid}'`;
      }

      const child = spawn(cmd, { shell: true, detached: true });
      child.unref();

      const timer = setTimeout(() => {
        try { process.kill(-child.pid, 'SIGKILL'); }
        catch (e) { console.error(e); }
        listeners.delete(deviceid);
      }, 60_000);

      child.stdout.on('data', (buf: Buffer) => {
        void (async () => {
          const line = buf.toString();
          dataBuffer.push(line);
          dataChunkId++;
          const now = Date.now();
          if (now - lastTimePosted < 3000) return;

          const newData = dataBuffer.join('');
          dataBuffer = [];
          lastTimePosted = now;

          try {
            const resp = await fetch(targetEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ device_id: deviceid, sequence_number: dataChunkId, log: newData }),
            });
            console.log(`Posted logs for ${deviceid}, status ${resp.status}`);
          } catch (err: any) {
            console.error(`Post error for ${deviceid}:`, err.message);
          }
        })();
      });

      child.stderr.on('data', d => console.error(`stderr ${deviceid}:`, d.toString()));
      child.on('exit', () => listeners.delete(deviceid));
      child.on('error', () => listeners.delete(deviceid));

      listeners.set(deviceid, { child, timer });

      res.json({
        status: "Listener started",
        deviceid,
        pid: child.pid
      });
    })().catch(next);
  }
);

app.listen(port, () => {
  console.log(`Server listening on ${port}`);
});



/**
 * @param {string}            logFile       Path to the log file
 * @param {string|undefined}  pppoeUsername PPPoE username to search for
 * @param {string[]|undefined} macList      List of MACs to search for
 * @returns {Promise<string|undefined>} the found deviceId, or undefined
 */
async function tryToFindDeviceId(pppoeUsername: string | undefined, macList: string[]): Promise<string | undefined> {
  if (!pppoeUsername && (!macList || macList.length === 0)) return

  // read entire file into memory, split into lines, keep only the last MAX_LINES
  const content = await new Promise<string>((resolve, reject) => {
    const tailProc = spawn('tail', ['-n', MAX_LINES.toString(), logFile])
    let data = ''
    tailProc.stdout.setEncoding('utf8')
    tailProc.stdout.on('data', chunk => { data += chunk })
    tailProc.on('error', err => reject(err))
    tailProc.on('close', () => resolve(data))
  })
  const tail = content.split('\n')

  // scan from newest to oldest
  for (let i = tail.length - 1; i >= 0; i--) {
    const line = tail[i]
    if (
      (pppoeUsername && line.includes(pppoeUsername)) ||
      (macList && macList.some(mac => line.includes(mac)))
    ) {
      const deviceId = extractDeviceId(line)
      if (deviceId) return deviceId
    }
  }
}

/**
 * Extract the 4th “word” (without trailing colon) if it has exactly 3 dashes.
 */
function extractDeviceId(line: string): string | undefined {
  const parts = line.trim().split(/\s+/)
  if (parts.length < 4) return undefined
  const candidate = parts[3].replace(/:$/, '')
  return (candidate.match(/-/g) || []).length === 3 ? candidate : undefined
}