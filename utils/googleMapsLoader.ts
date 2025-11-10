declare global {
  interface Window {
    google: any;
    initMapCallback: () => void;
    gm_authFailure: () => void;
  }
}

let googleMapsPromise: Promise<void> | null = null;

export const loadGoogleMapsScript = (): Promise<void> => {
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve();
      return;
    }

    const callbackName = 'initMapCallback';
    const authErrorCallbackName = 'gm_authFailure';
    const scriptId = 'google-maps-script';

    const cleanup = () => {
        const script = document.getElementById(scriptId);
        if (script) {
            script.remove();
        }
        delete (window as any)[callbackName];
        delete (window as any)[authErrorCallbackName];
        googleMapsPromise = null; 
    };

    window[callbackName] = () => {
      resolve();
      delete (window as any)[callbackName];
      delete (window as any)[authErrorCallbackName];
    };

    window[authErrorCallbackName] = () => {
      reject(new Error('Google Maps authentication failed. The API key may be invalid, restricted, or missing necessary permissions (Maps JavaScript API, Places API) or billing configuration.'));
      cleanup();
    };
    
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
        existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.API_KEY}&libraries=places&callback=${callbackName}&auth_error_callback=${authErrorCallbackName}`;
    script.async = true;
    script.defer = true;

    script.onerror = () => {
      reject(new Error('Failed to load the Google Maps script. Please check your network connection.'));
      cleanup();
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
};