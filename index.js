import http from 'http';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import dotenv from 'dotenv';

ffmpeg.setFfmpegPath(ffmpegStatic);
dotenv.config();

const port = process.env.PORT || 3000;

import { getLinkType, getYoutubeVideoIdFromLink, getYoutubePlaylistIdFromLink, sendErrorResponseToClient } from './utils/youtube/helpers.js';
import { youtubeSingleSongDownload, youtubePlaylistDownload } from './utils/youtube/downloads.js'

const server = http.createServer(async (req, res) => {
    try {
        // Handle download request from users
        if (req.method === "POST" && req.url === '/requestDownload') {
            await handleDownloadRequest(req, res)
        }
        else if (req.method === 'GET') {
            await handleGetRequests(req, res)
        }
        else {
            sendErrorResponseToClient(res, 404, "application/json", "Request Not found", responseSent)
        }
    }
    catch (error) {
        sendErrorResponseToClient(res, 500, 'application/json', 'Internal server error');
    }
});

server.listen(port, function(error) {
    if (error) {
        console.log("Error: ", error);
    } 
    else {
        console.log("Server is listening on port", port);
        console.log("http://localhost:" + port)
    }
});

function handleDownloadRequest(req, res) {
    let body = ''
    req.on('data', chunk => {
        // Convert Buffer to string
        body += chunk.toString()
    });
    let responseSent = false // Boolean so we do not send multiple responses
    req.on('end', async () => {
        try {
            // Parse the JSON data
            const clientData = JSON.parse(body)

            // get the type of link
            const { musicPlatform, type } = getLinkType(clientData.link)
            console.log("clientData.link: " + clientData.link) // Log requested link
            console.log("Link Type: " + musicPlatform + " " + type) // Log link info

            // download song or playlist and send back to user
            if (!responseSent) {
                if (musicPlatform === 'youtube' && type === 'song') {
                    let videoId = getYoutubeVideoIdFromLink(clientData.link);
                    await youtubeSingleSongDownload(videoId, res, responseSent); // send a single song download to user
                }
                else if (musicPlatform === 'youtube' && type === 'playlist') {
                    let playlistId = getYoutubePlaylistIdFromLink(clientData.link)
                    await youtubePlaylistDownload(playlistId, res, responseSent); // send a playlist download to user
                }
                else {
                    // Handle invalid or bad link
                    sendErrorResponseToClient(res, 400, 'application/json', 'Invalid or bad link', responseSent)
                }
            }
        } 
        catch (error) {
            // Handle JSON parsing error
            sendErrorResponseToClient(400, 'application/json', 'Bad request', responseSent)
        }
    });
}

async function handleGetRequests(req, res) {
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