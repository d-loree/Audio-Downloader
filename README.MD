# Audio Downloader

Note: This applicatrion is still in production. As of now, only youtube songs and playlists can be downloaded. 

## Introduction
Audio Downloader allows users to download songs from SoundCloud or YouTube for personal use. 

***Disclaimer**: Audio Downloader is intended for personal, non-commercial use to download content you're legally entitled to. Please respect copyright laws.*

## Prerequisites
- Node.js: Install using Node Version Manager (nvm) or download from [Node.js Downloads](https://nodejs.org/en/download)
- Youtube API key: [Get it here](https://console.cloud.google.com/marketplace/product/google/youtube.googleapis.com?pli=1)

## Setup
- Download or clone the repository

- In the projects root directory, install dependencies using `npm install`

- Create a `.env` file inside the root directory and add your youtube api key to the file like so: `YOUTUBE_API_KEY=your_youtube_api_key_here`

## Running Server
- In the directory with index.js, run `node ./index.js` to run the application
