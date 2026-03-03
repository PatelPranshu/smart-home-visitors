/**
 * server-status.js
 * Utility to check backend server health before making API calls.
 */

const HEALTH_API_URL = 'https://smart-home-visitors.onrender.com/api/health';

/**
 * Checks if the backend server is awake and healthy.
 * @param {Function} onLoading - Callback triggered if the server is sleeping and needs a loading UI.
 * @param {Function} onReady - Callback triggered when the server is confirmed online.
 */
async function checkServerStatus(onLoading, onReady) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout for initial check

        const res = await fetch(HEALTH_API_URL, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
            const data = await res.json();
            if (data.status === 'ok') {
                onReady();
                return;
            }
        }
    } catch (err) {
        // Initial quick check failed, server is likely sleeping
        console.warn('Initial server health check failed, starting polling...');
    }

    // Server is probably down or waking up, call onLoading
    if (onLoading && typeof onLoading === 'function') {
        onLoading();
    }

    // Start polling every 3 seconds
    const pollInterval = setInterval(async () => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            const res = await fetch(HEALTH_API_URL, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                if (data.status === 'ok') {
                    clearInterval(pollInterval);
                    if (onReady && typeof onReady === 'function') {
                        onReady();
                    }
                }
            }
        } catch (err) {
            // Still sleeping or offline
            console.log('Waiting for server response...');
        }
    }, 3000);
}
