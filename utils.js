import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execFilePromise = promisify(execFile);

const manageFolders = ({ roomId }) => {
  if (!roomId) return [`You need A room Id Nigger`];
  const [id, server] = roomId.split(":");
  // console.log(id, server);
  const folders = ["config", server, id];
  const folder = path.join(process.cwd(), ...folders);
  fs.mkdirSync(folder, { recursive: true });

  return [null, folder];
};

const getChannelId = async ({ channelName }) => {
  const key = JSON.parse(fs.readFileSync("token.json"))["yt"];
  const cleanHandle = channelName.replace(/^@/, "");
  const url =
    `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${
      encodeURIComponent(cleanHandle)
    }&key=${key}`;
  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.items?.length > 0) {
      return data.items[0].id;
    }
	return null
  } catch (err) {
    return null;
  }
};
export { getChannelId, manageFolders };
