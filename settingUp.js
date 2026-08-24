import { manageFolders } from "./utils.js";
import { updateChannel } from "./configuring.js";

import fs from "fs";
const main = async () => {
  try {
    const [err, folder] = manageFolders({
      roomId: "!xmxgSsZfNpaMgGtHGH:matrix.org",
    });
    const listData = JSON.parse(fs.readFileSync("playlist.json"));
    for (const { lastVideoId, ...data } of listData) {
      updateChannel({
        ...data,
        checkLiveStream: true,
        checkShorts: true,
        checkLongVideos: true,
        folder,
        lastVideoIds: null,
      });
    }
  } catch (error) {
    console.log(error);
  }
};
main();
