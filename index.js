const http = require('http');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);
require('dotenv').config();
const JSZip = require('jszip');
const sanitize = require('sanitize-filename');

const port = 3000;
const YOUTUBE_API_KEY= process.env.YOUTUBE_API_KEY
const MAX_PLAYLIST_RESULTS = 20



// Get the link type: The music platform and its type, playlist or song
let youtubeSongPattern = /^(?:https?:\/\/)?(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)(?:&.*)?$/;
let youtubePlaylistPattern = /^https:\/\/www\.youtube\.com\/playlist\?list=(PL[a-zA-Z0-9_-]+)$/;
function getLinkType(link) {
    if (youtubeSongPattern.test(link)) {
        return { musicPlatform: 'youtube', type: 'song' };
    } else if (youtubePlaylistPattern.test(link)) {
        return { musicPlatform: 'youtube', type: 'playlist' };
    } else {
        return { musicPlatform: 'invalid', type: 'invalid' };
    }
}

function getYoutubeVideoIdFromLink(youtubeLink) {
    const youtubeSongIdPattern = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = youtubeLink.match(youtubeSongIdPattern);
    return match ? match[1] : null;
}

function getYoutubePlaylistIdFromLink(youtubeLink) {
    const youtubePlaylistIdPattern = /[?&]list=(PL[a-zA-Z0-9_-]+)/;
    const match = youtubeLink.match(youtubePlaylistIdPattern);
    return match ? match[1] : null;
}

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

async function youtubeSingleSongDownload(videoId, res) {
    ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`).then(info => {
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

    }).catch(error => {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to download audio' }));
        responseSent = true
    });
}

async function youtubePlaylistDownload(playlistId, res) {
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
    } catch (error) {
        console.error("ERROR while creating ZIP file: ", error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed to download playlist' }));
    }
}

const server = http.createServer(function(req, res) {

    // Handle download request from users
    if (req.method === "POST" && req.url === '/requestDownload') {
        let body = ''
        req.on('data', chunk => {
            // Convert Buffer to string
            body += chunk.toString()
        });
        var responseSent = false // Boolean so we do not send multiple responses
        req.on('end', async () => {
            try {
                // Parse the JSON data
                const clientData = JSON.parse(body)

                // get the type of link / check if valid
                const { musicPlatform, type } = getLinkType(clientData.link)
                console.log("clientData.link: " + clientData.link) // Log requested link
                console.log("Link Type: " + musicPlatform + " " + type) // Log link info

                if (musicPlatform == 'invalid' || type == 'invalid') {
                    // Let user know the link is invalid
                    if(!responseSent) {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({ error: 'Invalid Link' }))
                        responseSent = true
                    }
                }
                else {
                    // download song or playlist and send back to user
                    if (!responseSent) {
                        if (musicPlatform === 'youtube' && type === 'song') {
                            let videoId = getYoutubeVideoIdFromLink(clientData.link);
                            await youtubeSingleSongDownload(videoId, res); // send a single song download to user
                        }
                        else if (musicPlatform === 'youtube' && type === 'playlist') {
                            let playlistId = getYoutubePlaylistIdFromLink(clientData.link)
                            await youtubePlaylistDownload(playlistId, res); // send a playlist download to user
                        }
                        else {
                            res.writeHead(200, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({ error: 'Invalid Link' }));
                            responseSent = true;
                        }
                    }
                }
            } 
            catch (error) {
                // Handle JSON parsing error
                res.writeHead(400, {'Content-Type': 'application/json'})
                res.end(JSON.stringify({ error: 'Bad request' }))
            }
        });
    }
    else if (req.method === 'GET') {
        // Base directory for client files
        let filePath = './client' 

        // Get the path to file requested
        if(req.url === '/') { filePath += '/home.html' } 
        else { filePath += req.url }
    
        // Determine content type
        let contentType = 'text/html'; // Default content type
        const ext = path.extname(filePath)
        if(ext === '.css') { contentType = 'text/css' } 
        else if (ext === '.js') { contentType = 'application/javascript' }
        
        // Send files to client
        fs.readFile(filePath, function(error, data) {
            if (error) {
                res.writeHead(404)
                res.write('Error: File Not Found')
            } 
            else {
                res.writeHead(200, {'Content-Type': contentType})
                res.write(data)
            }
            res.end();
        });
    }
    else {
        res.writeHead(404)
        res.end('Not Found')
    }
});

server.listen(port, function(error) {
    if (error) {
        console.log("Error:", error);
    } 
    else {
        console.log("Server is listening on port", port);
        console.log("http://localhost:" + port)
    }
});
