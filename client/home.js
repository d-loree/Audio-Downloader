const button = document.getElementById('download-btn');
const searchField = document.getElementById('search-field');
const notifyText = document.getElementById('notify-msg-area');
const downloadBtn = document.getElementById('download-btn');
const agreeTerms = document.getElementById('agree-terms');

// Enable the download button only when the terms checkbox is checked
agreeTerms.addEventListener('change', function () {
    downloadBtn.disabled = !agreeTerms.checked;
});
    
button.addEventListener('click', async _ => {
    try {   
        const userLink = searchField.value.trim();

        if (userLink == "") {
            displayError("No Link")
        }
        else {
            clearNotifyMessage()

            // Notify user of download attempt
            displayMessage("Downloading Audio")

            const response = await fetch('requestDownload', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    link: userLink
                })
            });

            if (!response.ok) {
                let data = await response.json()
                if (data.error) { throw new Error(data.error) }
                else throw new Error('Network response was not ok');
            }

            // Check the response's Content-Type header
            const contentType = response.headers.get('Content-Type');

            if (contentType.includes('application/json')) {
                // Handle JSON responses (should be message)
                const data = await response.json(); // Parse JSON from the response

                // Handle message response from server
                if (data.message) { displayMessage(data.message) }
            }
            else if (contentType.includes('audio/mpeg')) {
                // Handle single MP3 file download
                filename = response.headers.get('filename')
                
                response.blob().then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    // Set the filename for the download here with the .mp3 extension
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);

                    displayMessage("Audio Downloaded")
                });
            }
            else if (contentType.includes('application/zip')) {
                // Handle ZIP file download
                response.blob().then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = 'playlist.zip';
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                
                    displayMessage("Playlist Downloaded")
                });
            }
        }
    } 
    catch(error) {
        displayError(error)
    }
});

async function displayMessage(message) {
    notifyText.classList.remove("error");
    notifyText.style.display = "flex";
    notifyText.innerHTML = message; 
}

async function displayError(error) {
    notifyText.classList.add("error");
    notifyText.style.display = "flex";
    notifyText.innerHTML = error;
}

async function clearNotifyMessage() {
    searchField.value = ''
    notifyText.classList.remove("error");
    notifyText.style.display = "none";
    notifyText.innerHTML = ""; 
}