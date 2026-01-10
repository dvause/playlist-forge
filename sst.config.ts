// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "playlist-shuffler",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // Define secrets for OAuth credentials
    const spotifyClientId = new sst.Secret("SpotifyClientId");
    const spotifyClientSecret = new sst.Secret("SpotifyClientSecret");
    const youtubeClientId = new sst.Secret("YouTubeClientId");
    const youtubeClientSecret = new sst.Secret("YouTubeClientSecret");

    const web = new sst.aws.Nextjs("PlaylistShuffler", {
      environment: {
        SPOTIFY_CLIENT_ID: spotifyClientId.value,
        SPOTIFY_CLIENT_SECRET: spotifyClientSecret.value,
        YOUTUBE_CLIENT_ID: youtubeClientId.value,
        YOUTUBE_CLIENT_SECRET: youtubeClientSecret.value,
      },
    });

    return {
      url: web.url,
    };
  },
});
