const http = require('http');
const fs = require('fs');
const path = require('path');
const port = 3000;



// Get the link type: The music platform and its type, playlist or song
let youtubeSongPattern = /^(https?:\/\/)?(www\.youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+$/;
let youtubePlaylistPattern = /(?:https?:\/\/)?www\.youtube\.com\/.*[?&]list=([\w-]+)/;
function getLinkType(link) {
    if (youtubeSongPattern.test(link)) {
        return { musicPlatform: 'youtube', type: 'song' };
    } else if (youtubePlaylistPattern.test(link)) {
        return { musicPlatform: 'youtube', type: 'playlist' };
    } else {
        return { musicPlatform: 'invalid', type: 'invalid' };
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
        let responseSent = false // Boolean so we do not send multiple responses
        req.on('end', () => {
            try {
                // Parse the JSON data
                const clientData = JSON.parse(body)

                // get the type of link / check if valid
                const { musicPlatform, type } = getLinkType(clientData.link)
                console.log("clientData.link: " + clientData.link) // Log requested link
                console.log("Link Type: " + musicPlatform + " " + type) // Log link info

                if (musicPlatform == 'invalid') {
                    // Let user know the link is invalid
                    if(!responseSent) {
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({ message: 'Invalid Link' }))
                        responseSent = true
                    }
                }
                else {
                    // download song or playlist and send back to user here ---------------------
                    if (!responseSent) {
                        // Send a response back to the client
                        res.writeHead(200, {'Content-Type': 'application/json'});
                        res.end(JSON.stringify({ message: 'Request received' }))
                        responseSent = true
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
