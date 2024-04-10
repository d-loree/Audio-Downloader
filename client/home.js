const button = document.getElementById('download-btn');
const searchField = document.getElementById('search-field');
const notifyText = document.getElementById('notify-msg-area');

button.addEventListener('click', async _ => {
    try {   
        const userLink = searchField.value;
        searchField.value = ''
        notifyText.classList.remove("error");
        notifyText.style.display = "none";
        notifyText.innerHTML = ""; 
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
            notifyText.classList.remove("error");
            notifyText.style.display = "flex";
            notifyText.innerHTML = "Downloading Audio..."; 

            // Handle MP3 file download
            response.blob().then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                // Set the filename for the download here with the .mp3 extension
                a.download = 'download.mp3';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);

                notifyText.innerHTML = "Audio Downloaded"; 
            });
        }
    } 
    catch(error) {
        notifyText.classList.add("error");
        notifyText.style.display = "flex";
        notifyText.innerHTML = `Error: ${error.message}`;
    }
});
