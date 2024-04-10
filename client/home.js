const button = document.getElementById('download-btn');
const searchField = document.getElementById('search-field');
const notifyText = document.getElementById('notify-msg-area');

button.addEventListener('click', async _ => {
    try {   
        const userLink = searchField.value;
        searchField.value = ''
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
    catch(error) {
        notifyText.classList.add("error");
        notifyText.style.display = "flex";
        notifyText.innerHTML = `Error: ${error.message}`;
    }
});
