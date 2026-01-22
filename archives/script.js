/**
 * Function to handle navigation
 * @param {string} genre - The name of the genre clicked
 */
function navigateTo(genre) {
    console.log("Navigating to: " + genre);
    
    // In a real project, you would have files like rock.html, indie.html, etc.
    // This line redirects the browser to that page.
    window.location.href = genre + ".html";
}

/* FUTURE INTEGRATION STEPS:
   1. Embedded Music: Inside navigateTo, you could trigger a Spotify/YouTube 
      iframe to start playing.
   2. Session Timer: You can add a 'setInterval' function here to track
      how long a user spends in a specific genre.
   3. Local Storage: Save the user's "Last Listened" genre to keep 
      personalization consistent.
*/