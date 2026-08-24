// const accountToken = env.token;
import {
  AutojoinRoomsMixin,
  MatrixClient,
  RustSdkCryptoStorageProvider,
  SimpleFsStorageProvider,
} from "matrix-bot-sdk";
const accountToken = JSON.parse(fs.readFileSync("token.json"))["token"];
const homeserverUrl = "https://matrix-client.matrix.org";

const storage = new SimpleFsStorageProvider("bot-sync.json");
const crypto = new RustSdkCryptoStorageProvider("./bot-crypto-store");

const client = new MatrixClient(
  homeserverUrl,
  accountToken,
  storage,
  crypto,
);
client.timeoutMs = 60000;

import { manageFolders } from "./utils.js";
import { updateChannel } from "./configuring.js";
import Parser from "rss-parser";
import fs from "fs";
const parser = new Parser();

const setRssStrings = (
  { channelId, checkLiveStream, checkShorts, checkLongVideos },
) => {
  const identifiers = [];
  if (checkLiveStream) identifiers.push("UULF");
  if (checkShorts) identifiers.push("UUSH");
  if (checkLongVideos) identifiers.push("UULV");
  if (identifiers.length === 0) return [];
  return identifiers.map((i) =>
    `https://www.youtube.com/feeds/videos.xml?playlist_id=${
      i + channelId.slice(2)
    }`
  );
  // return `https://www.youtube.com/feeds/videos.xml?playlist_id=${channelId}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWithRetry = async (fn, retries = 3, delay = 4000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      const backoff = delay * (i + 1);
      console.warn(
        `Matrix request failed (${err.message}). Retrying in ${
          backoff / 1000
        }s...`,
      );
      await sleep(backoff);
    }
  }
};
const postOnMatrix = async ({ roomId, content }) => {
  try {
    return await sendWithRetry(() => client.sendHtmlText(roomId, content));
  } catch (error) {
    console.log(error);
  }
};

const handlePosting = async (
  { roomId, title, id, url, thumbnail, channelName, feedTitle },
) => {
  try {
    const content1 = `<b>-------------------------------------------</b><br>` +
      `<b>New ${feedTitle.slice(0, -1)} From: ${channelName}</b><br>` +
      `<b><a href="${url}">${title}</a></b>`;

    const posted1 = await postOnMatrix({ roomId, content: content1 });
    if (!posted1) return null;

    await sleep(2000);
    let mxcUrl = null;
    try {
      mxcUrl = await sendWithRetry(() =>
        client.uploadContentFromUrl(thumbnail)
      );
    } catch (err) {
      console.error(`Failed to upload thumbnail for ${id}:`, err.message);
    }

    if (mxcUrl) {
      const imageEventContent = {
        msgtype: "m.image",
        body: `${title} Thumbnail`,
        url: mxcUrl,
        info: {
          mimetype: "image/jpeg",
          w: 1280,
          h: 720,
        },
      };

      const posted2 = await sendWithRetry(() =>
        client.sendEvent(roomId, "m.room.message", imageEventContent)
      );

      if (!posted2) return false;
    }
    await sleep(4000);

    return true;
  } catch (error) {
    console.log(error);
    return null;
  }
};

const setSchema = ({ feedItem }) => {
  const { id, title, author, channelName } = feedItem;

  const videoId = id.replace("yt:video:", "");

  return {
    id: videoId,
    title,
    url: `https://youtu.be/${videoId}`,
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    channelName: author ?? channelName,
  };
};
import path from "path";

const getListData = ({ folder }) => {
  const items = fs.readdirSync(folder);
  if (items.length === 0) return null;
  return items.map((n) => {
    const data = JSON.parse(fs.readFileSync(path.join(folder, n)));

    return { channelName: n.replace(".json", ""), ...data };
  });
};

const isReverseOrder = ({ items }) => {
  //last item is before first item
  return items.at(-1)["isoDate"] < items[0]["isoDate"];
};

const main = async ({ roomId }) => {
  try {
    const [err, folder] = manageFolders({ roomId });
    console.log(folder);

    const listData = getListData({ folder });
    // setRssStrings()
    const allFeeds = await Promise.allSettled(
      listData.reduce((
        a,
        {
          channelName,
          channelId,
          checkLiveStream,
          checkShorts,
          checkLongVideos,
          lastVideoIds,
        },
        i,
      ) => {
        const rssStrings = setRssStrings({
          channelId,
          checkLiveStream,
          checkShorts,
          checkLongVideos,
        });
        if (rssStrings === 0) return a;
        a.push(i);
        rssStrings.forEach((s) => a.push(parser.parseURL(s)));
        return a;
      }, []),
    );
    let changed = false;
    let channelUpdated = false;
    let currentChannelName = null;
    let currentLastVideoIds = null;
    let currentChannelId = null;
    let previousRef = null;
    for (const feedResult of allFeeds) {
      const { status, value } = feedResult;

      if (status === "rejected") {
        console.error(
          `Skipping ${currentChannelName}: Feed fetch failed (${feedResult.reason})`,
        );
        continue;
      }
      //value can be a numbr that refecrence the og array
      if (typeof value === "number") {
        //setting variables
        if (currentChannelName) {
          if (channelUpdated) {
            console.log(currentLastVideoIds);
            await updateChannel({
              ...listData[previousRef],
              lastVideoIds: currentLastVideoIds,
              folder,
            });

            channelUpdated = false;
          }
          console.log(`Finished Updating Channel ${currentChannelName}`);
        }

        const {
          channelName,
          lastVideoIds,
          channelId,
        } = listData[value];
        console.log(`Updating Channel ${channelName}`);
        previousRef = value;
        currentChannelName = channelName;
        currentLastVideoIds = lastVideoIds;
        currentChannelId = channelId;
        continue;
      }
      const items = value["items"] ?? [];
      if (items.length === 0) {
        continue;
      }
      //feed title is one of

      const feedTitle = value["title"];
      const feedIdentifier = value["feedUrl"].replace(
        currentChannelId.slice(2),
        "",
      ).replace(
        "http://www.youtube.com/feeds/videos.xml?playlist_id=",
        "",
      );
      // console.log(feedTitle);
      // console.log("feedIdentifier", feedIdentifier);
      // console.log(value["feedUrl"]);
      if (!currentLastVideoIds) {
        const videoItem = setSchema({ feedItem: items[0] });
        if (!changed) await client.start();
        changed = true;

        const posted = await handlePosting({
          ...videoItem,
          feedTitle,
          roomId,
        });
        if (posted) {
          currentLastVideoIds = {
            [feedIdentifier]: videoItem["id"],
          };
          channelUpdated = true;
        }
        continue;
      }
      //for adding last updated now that each feed is formed pr whatever
      if (!currentLastVideoIds[feedIdentifier]) {
        const videoItem = setSchema({ feedItem: items[0] });
        if (!changed) await client.start();
        changed = true;
        const posted = await handlePosting({
          ...videoItem,
          feedTitle,
          roomId,
        });
        if (posted) {
          currentLastVideoIds[feedIdentifier] = videoItem["id"];
          channelUpdated = true;
        }
        continue;
      }
      const reverseOrder = ({ items }) => {
        //last item is before first item
        return items.at(-1)["isoDate"] < items[0]["isoDate"];
      };

      const newVideos = [];

      const newFirst = reverseOrder({ items }) ? items : items.toReversed();

      for (const item of newFirst) {
        const videoItem = setSchema({ feedItem: { ...item } });

        if (videoItem["id"] === currentLastVideoIds[feedIdentifier]) break; // Reached already-posted milestone

        newVideos.push(videoItem);
      }

      if (newVideos.length === 0) {
        continue;
      }

      if (newVideos.length > 1) {
        if (!changed) await client.start();
        console.log(items);

        await client.sendText(
          roomId,
          `Some Retarded Shit Happened, here is the RSS Dump\n${
            JSON.stringify(items)
          }`,
        );
        await client.stop();

        return;
      }
      const videosToPost = newVideos.toReversed();
      if (!changed) await client.start();
      changed = true;
      let lastVideoIdPosted = currentLastVideoIds[feedIdentifier];

      // "2026-08-21T15:00:39.000Z" "2026-06-16T15:00:21.000Z"
      for (const { title, id, url, thumbnail, channelName } of videosToPost) {
        const posted = await handlePosting({
          title,
          id,
          url,
          thumbnail,
          channelName,
          roomId,
          feedTitle,
        });
        if (posted) {
          lastVideoIdPosted = id;
          channelUpdated = true;
        }
      }

      currentLastVideoIds[feedIdentifier] = lastVideoIdPosted;
    }
    if (channelUpdated) {
      await updateChannel({
        ...listData[previousRef],
        lastVideoIds: currentLastVideoIds,
        folder,
      });
    }
    // console.log(currentLastVideoIds);

    console.log(`Finished Updating Channel ${currentChannelName}`);
    if (changed) {
      await client.stop();
    }
    // console.log(res);
  } catch (err) {
    console.error("Fatal startup error:", err);
    // process.exit(0);
  } finally {
  }
};
// main({ roomId: "!zJukHsnBWvvFnBCMEt:matrix.org" });
// const MyroomId = "!zJukHsnBWvvFnBCMEt:matrix.org"; //test
// const MyroomId = "!xmxgSsZfNpaMgGtHGH:matrix.org"; //gen
import cron from "node-cron";

cron.schedule("*/2 * * * *", async () => {
  const roomToRun = JSON.parse(fs.readFileSync("rommIds.json"))["general"];
  console.log(
    "running a task every 2mins on Channel ",
    roomToRun,
  );
  console.log("Running Check: ", new Date().toISOString());
  main({ roomId: roomToRun });
});
