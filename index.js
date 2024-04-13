const http = require('http');
const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegStatic);
require('dotenv').config();

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

async function fetchPlaylistSongs(playlistTestId) {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistTestId}&key=${YOUTUBE_API_KEY}&maxResults=${MAX_PLAYLIST_RESULTS}`);
    const data = await response.json();

    // console.log(JSON.stringify(data.items)); // For testing purposes

    let playlistVideoIds = []
    data.items.forEach(song => {
        playlistVideoIds.push(song.snippet.resourceId.videoId)
    });

    console.log("\nVideo Ids: " + playlistVideoIds)
}

const server = http.createServer(function(req, res) {

    // Handle download request from users
    if (req.method === "POST" && req.url === '/requestDownload') {
        let body = ''
        req.on('data', chunk => {
            // Convert Buffer to string
            body += chunk.toString()
        });
        let responseSent = false // Boolean so we do not send multiple responses
        req.on('end', () => {
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
                            ytdl.getInfo(clientData.link).then(info => {
                                const title = info.videoDetails.title.replace(/[^\w\s]/gi, '');
                                res.writeHead(200, {
                                    'Content-Type': 'audio/mpeg',
                                    'filename': `${title}.mp3`
                                });

                                // Stream the audio from ytdl-core to ffmpeg to convert it to mp3
                                const stream = ytdl(clientData.link, { quality: 'highestaudio', filter: 'audioonly' });
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
                        else {
                            res.writeHead(200, {'Content-Type': 'application/json'});
                            res.end(JSON.stringify({ error: 'Invalid Link' }))
                            responseSent = true
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
