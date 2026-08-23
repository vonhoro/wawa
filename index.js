import { handler } from "./configuring.js";
import {
  AutojoinRoomsMixin,
  MatrixClient,
  RustSdkCryptoStorageProvider,
  SimpleFsStorageProvider,
} from "matrix-bot-sdk";

import fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";

const execFilePromise = promisify(execFile);

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

// Enable automatic joining when invited to a room
AutojoinRoomsMixin.setupOnClient(client);

// Listen for messages as normal

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const getVideoInfo = async (youtubeUrl) => {
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${
      encodeURIComponent(youtubeUrl)
    }&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();

    return {
      title: data.title,
      thumbnail: data.thumbnail_url, // Best available thumbnail URL
      uploader: data.author_name,
      url: youtubeUrl,
    };
    return data;
  } catch (error) {
    console.error("Failed to fetch title:", error.message);
    return null;
  }
};

// Example usage:
/*
const getVideoInfo = async (videoUrl) => {
  try {
    // https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=wTiYaWFP59Q&format=json
    const { stdout } = await execFilePromise("yt-dlp", [
      "--dump-json",
      "--no-playlist",
      videoUrl,
    ]);

    const data = JSON.parse(stdout);

    return {
      title: data.title,
      thumbnail: data.thumbnail, // Best available thumbnail URL
      uploader: data.uploader,
      url: data.webpage_url,
    };
  } catch (error) {
    console.error("Failed to run yt-dlp:", error);
    return null;
  }
};
*/
// /*
client.on("room.message", async (roomId, event) => {
  const botUserId = await client.getUserId();

  // Ignore messages sent by the bot itself
  if (event.sender === botUserId) return;

  // Process text messages
  if (event.content?.msgtype === "m.text") {
    const text = event.content.body?.trim();
    console.log(`${event.sender} in ${roomId}: ${text}`);
    const [command, m1, m2] = text.split(" ");
    console.log("command, m1, m2", command, m1, m2);

    // Command Handlers
    if (command === "!ping") {
      await client.replyNotice(roomId, event, "Pong! (Encrypted response)");
      return;
    }
    if (command === "!hello") {
      await client.replyText(roomId, event, `Hello ${event.sender}! 👋`);
      return;
    }
    if (command === "!info") {
      const htmlBody =
        "<b>Bot Status:</b> <i>Online and fully encrypted!</i> 🔒";
      await client.replyHtmlText(roomId, event, htmlBody);
      return;
    }

    if (command === "!yt" || command === "!youtube") {
      console.log("running the youtube command");
      const vid = await getVideoInfo(m1.trim());
      if (!vid) {
        await client.replyText(roomId, event, "done badly");
        return;
      }

      const {
        title,
        thumbnail,
        uploader,
        url,
      } = vid;
      const mxcUrl = await client.uploadContentFromUrl(thumbnail);
      await sleep(1000);
      const html1 = `<b><a href="${url}">${title}</a></b>`;
      await client.replyHtmlText(roomId, event, html1);
      await sleep(1000);
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

        await client.sendEvent(roomId, "m.room.message", imageEventContent);
      }
      return;
    }

    if (command === "!rss") {
      const res = await handler({ roomId, command: m1, channelName: m2 });
      await client.replyHtmlText(roomId, event, res);
      return;
    }

    // await client.replyText(
    // roomId,
    // event,
    // `Hello ${event.sender}! You Are A Nigger :mikudance:`,
    // );
  }
});
// */
const main = async () => {
  try {
    //listener
    // console.log(accountToken);
    // return;
    await client.start();
    console.log("Bot running with autojoin enabled!");

    console.log(client);
  } catch (err) {
    console.error("Fatal startup error:", err);
  }
};

main();
// https://github.com/vonhoro/wawa.git
