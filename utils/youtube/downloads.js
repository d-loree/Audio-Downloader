import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import JSZip from 'jszip';
import sanitize from 'sanitize-filename';
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY
const MAX_PLAYLIST_RESULTS = process.env.MAX_PLAYLIST_RESULTS || 20

async function fetchYoutubePlaylistSongs(playlistId) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}&maxResults=${MAX_PLAYLIST_RESULTS}`);
    const data = await response.json();

    if (!data) {
        console.log("Issue getting playlist... Maybe playlist is private?") // send error message back to user through response?
        return new Map()
    }

    // console.log(JSON.stringify(data.items)); // For testing purposes

    let playlistVideosMap = new Map([]) // Store video ids with titles for file names
    data.items.forEach(song => {
        playlistVideosMap.set(song.snippet.resourceId.videoId, song.snippet.title)
    });

    console.log("\nVideos in playlist: ") // log videos in playlist, id and title for testing
    playlistVideosMap.forEach((value, key) => {
        console.log(`${key}: ${value}`);
    });

    return playlistVideosMap;
}

export async function youtubeSingleSongDownload(videoId, res, responseSent) {
    ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`)
    .then(info => {
        const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'filename': `${title}.mp3`
        });

        // Stream the audio from ytdl-core to ffmpeg to convert it to mp3
        const stream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { quality: 'highestaudio', filter: 'audioonly' });
        ffmpeg(stream)
            .audioBitrate(128)
            .toFormat('mp3')
            .on('error', (error) => {
                console.log('Error: ' + error.message);
                res.end();
            })
            .pipe(res, { end: true }); // Pipe mp3 to client
            responseSent = true

    })
    .catch(error => {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to download audio' }));
        responseSent = true
    });
}

export async function youtubePlaylistDownload(playlistId, res, responseSent) {
    try {
        playListMap = await fetchYoutubePlaylistSongs(playlistId) // Get a map of key-value pairs with song_id<->song_name
        const zip = new JSZip();

        console.log("Attempting playlist download...")
        // Download each video in playlist and add to zip
        for (const [key, value] of playListMap) {
            try {
                console.log(`Downloading video ${value}...`);
                const videoStream = ytdl(`http://www.youtube.com/watch?v=${key}`, { quality: 'highestaudio' });
                
                const chunks = [];
                for await (const chunk of videoStream) {
                    chunks.push(chunk);
                }
                
                const videoBuffer = Buffer.concat(chunks);
                const sanitizedFileName = sanitize(`${value}.mp3`);
                zip.file(sanitizedFileName, videoBuffer);
                console.log(`Added ${value}.mp3 to ZIP.`);
            }
            catch (error) {
                // Handle downloading file issue so the rest can download
                console.log(`Error while downloading ${key}:${value}`);
            }
        }

        // Save ZIP file in memory
        const content = await zip.generateAsync({ type: "nodebuffer" });
        fs.writeFileSync('playlist.zip', content);
        console.log('playlist.zip has been saved.');

        // send zip file to client
        res.writeHead(200, {
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename=playlist.zip'
        });
        res.end(content);
        responseSent = true
    } catch (error) {
        console.error("ERROR while creating ZIP file: ", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to download playlist' }));
        responseSent = true
    }
}