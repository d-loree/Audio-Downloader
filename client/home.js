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
            notifyText.style.display = "flex";
            notifyText.classList.add("error");
            notifyText.innerHTML = "No Link"; 
        }
        else {
            searchField.value = ''
            notifyText.classList.remove("error");
            notifyText.style.display = "none";
            notifyText.innerHTML = ""; 

            // Notify user of download attempt
            notifyText.classList.remove("error");
            notifyText.style.display = "flex";
            notifyText.innerHTML = "Downloading Audio"; 

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
                throw new Error('Network response was not ok');
            }

            // Check the response's Content-Type header
            const contentType = response.headers.get('Content-Type');

            if (contentType.includes('application/json')) {
                // Parse JSON from the response
                const data = await response.json(); 

                if (data.error) {
                    // handle error response from server
                    notifyText.classList.add("error");
                    notifyText.style.display = "flex";
                    notifyText.innerHTML = data.error;
                } 
                else if (data.message) {
                    // handle message response from server
                    notifyText.classList.remove("error");
                    notifyText.style.display = "flex";
                    notifyText.innerHTML = data.message; 
                }
            }
            else if (contentType.includes('audio/mpeg')) {
                // Handle MP3 file download
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

                    notifyText.innerHTML = "Audio Downloaded"; 
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
                
                    notifyText.innerHTML = "Playlist Downloaded";
                });
            }
        }
    } 
    catch(error) {
        notifyText.classList.add("error");
        notifyText.style.display = "flex";
        notifyText.innerHTML = `Error: ${error.message}`;
    }
});
