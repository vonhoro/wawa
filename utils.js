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
  const cleanHandle = channelName.replace(/^@/, "");
  const targetUrl = `https://www.youtube.com/@${cleanHandle}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        // Send a standard browser user-agent to get the desktop page layout
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube responded with HTTP status ${response.status}`);
    }

    const html = await response.text();

    // YouTube embeds the channel ID in metadata inside the raw HTML
    const match = html.match(/"channelId":"(UC[\w-]+)"/) ||
      html.match(/itemprop="channelId"\s+content="(UC[\w-]+)"/);

    if (match && match[1]) {
      return match[1]; // Returns the "UC..." Channel ID
    }

    return null;
  } catch (error) {
    console.error("Error fetching channel ID directly:", error);
    return null;
  }
};
export { getChannelId, manageFolders };
