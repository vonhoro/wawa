import fs from "fs";
import path from "path";
import { getChannelId, manageFolders } from "./utils.js";

const updateChannel = async (
  {
    channelName,
    lastVideoId,
    channelId,
    folder,
    checkLiveStream,
    checkShorts,
    checkLongVideos,
    lastVideoIds = {},
  },
) => {
  try {
    console.log(folder, channelName, lastVideoId, channelId);

    fs.writeFileSync(
      path.join(folder, `${channelName}.json`),
      JSON.stringify(
        {
          lastVideoId,
          channelId,
          checkLiveStream,
          checkShorts,
          checkLongVideos,
          lastVideoIds,
        },
        null,
        2,
      ),
    );
    return `Channel ${channelName} Updated Succefully!`;
  } catch (err) {
    console.log(err);
    return `Channel ${channelName} Wasn't Updated Myabe you are a gay retard!`;
  }
};

const addChannel = async (
  { channelName, folder, checkLiveStream, checkShorts, checkLongVideos },
) => {
  try {
    const channelId = await getChannelId({ channelName });
    if (!channelId) {
      return `<h2>Channel ${channelName} Wasn' Added Myabe you are a gay retard!</h2>`;
    }
    fs.writeFileSync(
      path.join(folder, `${channelName}.json`),
      JSON.stringify(
        {
          channelId,
          checkLiveStream: true,
          checkShorts: true,
          checkLongVideos: true,
          lastVideoIds: {},
        },
        null,
        2,
      ),
    );

    return `<h2>Channel ${channelName} Added Succefully!</h2>`;
  } catch (err) {
    console.log(err);
    return `<h2>Channel ${channelName} Wasn' Added Myabe you are a gay retard!</h2>`;
  }
};
const removeChannel = ({ channelName, folder }) => {
  fs.unlink(path.join(folder, `${channelName}.json`), (err) => {
    if (err) {
      console.log(err);
      return;
    }
    console.log("file deleted");
  });

  return `<h2>Channel ${channelName} was remove!</h2>`;
};

const listChannels = ({ folder }) => {
  return fs.readdirSync(folder).map((n) => n.replace(".json", ""));
};

// const MyroomId = "!zJukHsnBWvvFnBCMEt:matrix.org"; //test

const validComands = {
  help: true,
  add: true,
  list: true,
  remove: true,
  // update: true,
};
const handler = async ({ roomId, command, channelName }) => {
  const [err, folder] = manageFolders({ roomId });
  if (err) {
    return err;
  }

  if (!validComands[command]) {
    return `<h2>Retarded Nigger You Did it wrong run "!rss help" to stop being a faggot</h2>`;
  }

  if (command === "list") {
    const list = listChannels({ folder });
    if (list.length === 0) return `<b>No accounts added yet </b>`;
    return list.reduce(
      (a, c) => {
        a += `<li><b>${c}</b></li>\n`;

        return a;
      },
      `<b>These Are the Added Channels</b>\n<ol>`,
    ) + "\n</ol>";
  }
  if (command === "help") {
    return `
<h3>🤖 RSS Bot Commands</h3>
<p>Here are the available commands you can use:</p>
<ul>
  <li><code>!rss help</code> — Show this help message</li>
  <li><code>!rss list</code> — List all channels currently in the RSS feed</li>
  <li><code>!rss add &lt;channel&gt;</code> — Add a YouTube channel to the feed<br>
      <small><i>Note: Provide only the handle/name (e.g. <code>MentisWave</code>, not <code>@MentisWave</code> or a full URL).</i></small>
  </li>
  <li><code>!rss remove &lt;channel&gt;</code> — Remove a channel from the RSS feed</li>
</ul>
`;
  }

  if (!channelName) {
    return `<h2>Retarded Nigger You Did it wrong run "!rss help" to stop being a faggot</h2>`;
  }

  if (command === "add") {
    const res = await addChannel({ channelName, folder });
    return res;
  }
  if (command === "remove") {
    const res = await removeChannel({ channelName, folder });
    return res;
  }
};

export { handler, updateChannel };
