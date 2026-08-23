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
  try {
    console.log(channelName);
    const { stdout } = await execFilePromise("yt-dlp", [
      "--print",
      "playlist_channel_id",
      "--flat-playlist", // Extract metadata fast without resolving video streams
      "--playlist-items",
      "1", // Look at the first entry only
      "--no-warnings", // Prevent non-ID text in stdout
      `https://www.youtube.com/@${channelName}/videos`,
    ]);
    return stdout.trim();
  } catch (error) {
    console.error("Failed to fetch channel ID:", error);
    throw error;
  }
};
export { getChannelId, manageFolders };
