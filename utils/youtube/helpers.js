// Get the link type: The music platform and its type, playlist or song
const youtubeSongPattern = /^(?:https?:\/\/)?(?:www\.youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)(?:&.*)?$/;
const youtubePlaylistPattern = /^(?:https?:\/\/)?(?:www\.youtube\.com\/playlist\?list=|youtu\.be\/playlist\?list=)([\w-]+)(?:&.*)?$/;

export function getLinkType(link) {
    if (youtubeSongPattern.test(link)) {
        return { musicPlatform: 'youtube', type: 'song' };
    } else if (youtubePlaylistPattern.test(link)) {
        return { musicPlatform: 'youtube', type: 'playlist' };
    } else {
        return { musicPlatform: 'invalid', type: 'invalid' };
    }
}

export function getYoutubeVideoIdFromLink(youtubeLink) {
    const youtubeSongIdPattern = /(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = youtubeLink.match(youtubeSongIdPattern);
    return match ? match[1] : null;
}

export function getYoutubePlaylistIdFromLink(youtubeLink) {
    const youtubePlaylistIdPattern = /[?&]list=([a-zA-Z0-9_-]+)/;
    const match = youtubeLink.match(youtubePlaylistIdPattern);
    return match ? match[1] : null;
}

export function sendErrorResponseToClient(res, status, contentType, errorMessage, responseSent) {
    console.log(errorMessage)
    res.writeHead(status, {'Content-Type': contentType})
    res.end(JSON.stringify({ error: errorMessage }))
    responseSent = true;
}